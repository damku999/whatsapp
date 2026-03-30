<?php

namespace App\Services;

use App\Models\ChatbotFlow;
use App\Models\ChatbotNode;
use App\Models\ChatbotSession;
use App\Models\Contact;
use App\Models\ContactGroup;
use App\Models\User;
use App\Models\WaSession;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;

class ChatbotService
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * Process an incoming message and return the chatbot response (if any).
     *
     * Returns null when no chatbot flow matches or should handle this message.
     */
    public function processIncomingMessage(
        User $user,
        string $phone,
        string $content,
        string $sessionId,
    ): ?string {
        // Check for stop words first
        $normalised = strtolower(trim($content));

        if (in_array($normalised, ['stop', 'human', 'agent', 'quit', 'exit'], true)) {
            return $this->escalate($user, $phone);
        }

        // 1. Check if there's an active ChatbotSession for this phone + user
        $activeSession = ChatbotSession::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('contact_phone', $phone)
            ->where('is_active', true)
            ->where('is_escalated', false)
            ->first();

        if ($activeSession) {
            return $this->continueFlow($activeSession, $content, $sessionId);
        }

        // 2. No active session -- check all active flows for keyword match
        $flows = ChatbotFlow::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->orderByDesc('priority')
            ->get();

        foreach ($flows as $flow) {
            // Check office hours if enabled
            if ($flow->office_hours_only && !$this->isWithinOfficeHours($flow)) {
                continue;
            }

            if ($this->matchesKeyword($content, $flow)) {
                return $this->startFlow($user, $phone, $flow, $sessionId);
            }
        }

        // 3. No match found -- return the first active flow's fallback, or null
        $fallbackFlow = $flows->first();
        if ($fallbackFlow && $fallbackFlow->fallback_message) {
            return $fallbackFlow->fallback_message;
        }

        return null;
    }

    // -------------------------------------------------------------------------
    // Keyword matching
    // -------------------------------------------------------------------------

    private function matchesKeyword(string $content, ChatbotFlow $flow): bool
    {
        $keyword = $flow->trigger_keyword;
        $normalised = strtolower(trim($content));
        $keywordLower = strtolower(trim($keyword));

        return match ($flow->trigger_type) {
            'exact' => $normalised === $keywordLower,
            'contains' => str_contains($normalised, $keywordLower),
            'starts_with' => str_starts_with($normalised, $keywordLower),
            'regex' => (bool) @preg_match($keyword, $content),
            'any' => true,
            default => false,
        };
    }

    // -------------------------------------------------------------------------
    // Flow lifecycle
    // -------------------------------------------------------------------------

    /**
     * Start a new chatbot flow for this phone.
     */
    private function startFlow(User $user, string $phone, ChatbotFlow $flow, string $sessionId): ?string
    {
        // Deactivate any previous sessions for this phone
        ChatbotSession::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('contact_phone', $phone)
            ->where('is_active', true)
            ->update(['is_active' => false]);

        // Find the first node (lowest sort_order)
        $firstNode = $flow->nodes()->orderBy('sort_order')->first();

        if (!$firstNode) {
            return $flow->fallback_message;
        }

        $session = ChatbotSession::create([
            'user_id' => $user->id,
            'contact_phone' => $phone,
            'flow_id' => $flow->id,
            'current_node_id' => $firstNode->id,
            'variables_json' => [],
            'is_active' => true,
            'is_escalated' => false,
            'started_at' => now(),
        ]);

        return $this->processNode($firstNode, $session, null, $sessionId);
    }

    /**
     * Continue an existing flow with the user's reply.
     */
    private function continueFlow(ChatbotSession $session, string $userReply, string $sessionId): ?string
    {
        $currentNode = $session->currentNode;

        if (!$currentNode) {
            // Flow is broken or completed
            $session->update(['is_active' => false]);
            return null;
        }

        return $this->processNode($currentNode, $session, $userReply, $sessionId);
    }

    // -------------------------------------------------------------------------
    // Node processing
    // -------------------------------------------------------------------------

    /**
     * Process a single node and return the response text.
     *
     * The method handles the current node's logic, then may auto-advance
     * to the next node for node types that don't wait for user input.
     */
    private function processNode(
        ChatbotNode $node,
        ChatbotSession $session,
        ?string $userReply,
        string $sessionId,
    ): ?string {
        $content = $this->replaceVariables($node->content ?? '', $session);

        switch ($node->node_type) {
            case 'text':
                $this->advanceToNextNode($session, $node);
                return $content;

            case 'image':
                // For image nodes, the content is the caption; media_path holds the image.
                // The caller is responsible for sending the media via the engine.
                // We return the caption here.
                $this->advanceToNextNode($session, $node);
                if ($node->media_path) {
                    $waSession = $this->resolveWaSession($session);
                    if ($waSession) {
                        $this->engine->sendMessage(
                            sessionId: $waSession->engine_session_id,
                            to: $session->contact_phone,
                            type: 'image',
                            content: $content,
                            mediaUrl: asset('storage/' . $node->media_path),
                        );
                    }
                    return null; // Message already sent via engine
                }
                return $content;

            case 'button':
                if ($userReply === null) {
                    // First encounter: send the button message and wait
                    $this->sendButtonNode($node, $session, $content, $sessionId);
                    return null; // Message sent via engine
                }

                // User replied: match against options
                $options = $node->options_json ?? [];
                $nextNodeId = $this->matchButtonReply($userReply, $options);

                if ($nextNodeId) {
                    $nextNode = ChatbotNode::find($nextNodeId);
                    if ($nextNode) {
                        $session->update(['current_node_id' => $nextNode->id]);
                        return $this->processNode($nextNode, $session, null, $sessionId);
                    }
                }

                // No match -- repeat buttons or advance to default next
                $this->advanceToNextNode($session, $node);
                return $content;

            case 'list':
                if ($userReply === null) {
                    $this->sendListNode($node, $session, $content, $sessionId);
                    return null;
                }

                $options = $node->options_json ?? [];
                $nextNodeId = $this->matchListReply($userReply, $options);

                if ($nextNodeId) {
                    $nextNode = ChatbotNode::find($nextNodeId);
                    if ($nextNode) {
                        $session->update(['current_node_id' => $nextNode->id]);
                        return $this->processNode($nextNode, $session, null, $sessionId);
                    }
                }

                $this->advanceToNextNode($session, $node);
                return $content;

            case 'delay':
                $seconds = (int) ($node->options_json['seconds'] ?? 2);
                sleep(min($seconds, 30)); // Cap at 30 seconds
                $this->advanceToNextNode($session, $node);

                // Auto-process next node
                $nextNode = $session->fresh()->currentNode;
                if ($nextNode) {
                    return $this->processNode($nextNode, $session, null, $sessionId);
                }
                return null;

            case 'condition':
                // Evaluate user reply against conditions in options_json
                $conditions = $node->options_json ?? [];
                $nextNodeId = $this->evaluateConditions($userReply ?? '', $conditions, $session);

                if ($nextNodeId) {
                    $nextNode = ChatbotNode::find($nextNodeId);
                    if ($nextNode) {
                        $session->update(['current_node_id' => $nextNode->id]);
                        return $this->processNode($nextNode, $session, null, $sessionId);
                    }
                }

                // Default: advance normally
                $this->advanceToNextNode($session, $node);
                $nextNode = $session->fresh()->currentNode;
                if ($nextNode) {
                    return $this->processNode($nextNode, $session, null, $sessionId);
                }
                return null;

            case 'input':
                if ($userReply === null) {
                    // Prompt the user for input
                    return $content;
                }

                // Capture the reply as a variable
                $varName = $node->variable_name ?? 'input_' . $node->id;
                $variables = $session->variables_json ?? [];
                $variables[$varName] = $userReply;
                $session->update(['variables_json' => $variables]);

                $this->advanceToNextNode($session, $node);
                $nextNode = $session->fresh()->currentNode;
                if ($nextNode) {
                    return $this->processNode($nextNode, $session, null, $sessionId);
                }
                return null;

            case 'action':
                $this->executeAction($node, $session);
                $this->advanceToNextNode($session, $node);
                $nextNode = $session->fresh()->currentNode;
                if ($nextNode) {
                    return $this->processNode($nextNode, $session, null, $sessionId);
                }
                return $content ?: null;

            default:
                Log::warning("ChatbotService: Unknown node type '{$node->node_type}' in flow {$session->flow_id}");
                $this->advanceToNextNode($session, $node);
                return null;
        }
    }

    // -------------------------------------------------------------------------
    // Node helper methods
    // -------------------------------------------------------------------------

    /**
     * Advance session to the next node. Ends session if no next node.
     */
    private function advanceToNextNode(ChatbotSession $session, ChatbotNode $currentNode): void
    {
        if ($currentNode->next_node_id) {
            $session->update(['current_node_id' => $currentNode->next_node_id]);
        } else {
            // Try to find the next node by sort_order
            $nextBySortOrder = ChatbotNode::where('flow_id', $currentNode->flow_id)
                ->where('sort_order', '>', $currentNode->sort_order)
                ->orderBy('sort_order')
                ->first();

            if ($nextBySortOrder) {
                $session->update(['current_node_id' => $nextBySortOrder->id]);
            } else {
                // Flow is complete
                $session->update(['is_active' => false, 'current_node_id' => null]);
            }
        }
    }

    /**
     * Replace {{variable}} placeholders in content with session variables.
     */
    private function replaceVariables(string $content, ChatbotSession $session): string
    {
        $variables = $session->variables_json ?? [];

        return preg_replace_callback('/\{\{(\w+)\}\}/', function ($matches) use ($variables) {
            $key = $matches[1];
            return $variables[$key] ?? $matches[0];
        }, $content);
    }

    /**
     * Send a button-type message via the engine.
     */
    private function sendButtonNode(ChatbotNode $node, ChatbotSession $session, string $content, string $sessionId): void
    {
        $options = $node->options_json ?? [];
        $buttons = [];

        foreach ($options as $option) {
            if (isset($option['label'])) {
                $buttons[] = [
                    'id' => $option['id'] ?? $option['label'],
                    'text' => $option['label'],
                ];
            }
        }

        $waSession = $this->resolveWaSession($session);
        if (!$waSession) {
            return;
        }

        $this->engine->sendButtonMessage(
            sessionId: $waSession->engine_session_id,
            to: $session->contact_phone,
            body: $content,
            buttons: $buttons,
        );
    }

    /**
     * Send a list-type message via the engine.
     */
    private function sendListNode(ChatbotNode $node, ChatbotSession $session, string $content, string $sessionId): void
    {
        $options = $node->options_json ?? [];

        $sections = [];
        $currentSection = ['title' => 'Options', 'rows' => []];

        foreach ($options as $option) {
            $currentSection['rows'][] = [
                'id' => $option['id'] ?? $option['label'] ?? '',
                'title' => $option['label'] ?? 'Option',
                'description' => $option['description'] ?? '',
            ];
        }

        $sections[] = $currentSection;

        $waSession = $this->resolveWaSession($session);
        if (!$waSession) {
            return;
        }

        $this->engine->sendListMessage(
            sessionId: $waSession->engine_session_id,
            to: $session->contact_phone,
            body: $content,
            buttonText: 'Choose an option',
            sections: $sections,
        );
    }

    /**
     * Match a user's button reply against button options.
     */
    private function matchButtonReply(string $reply, array $options): ?int
    {
        $normalised = strtolower(trim($reply));

        foreach ($options as $option) {
            $label = strtolower(trim($option['label'] ?? ''));
            $id = strtolower(trim($option['id'] ?? ''));

            if ($normalised === $label || $normalised === $id) {
                return $option['next_node_id'] ?? null;
            }
        }

        return null;
    }

    /**
     * Match a user's list reply against list options.
     */
    private function matchListReply(string $reply, array $options): ?int
    {
        return $this->matchButtonReply($reply, $options);
    }

    /**
     * Evaluate conditions in a condition node against the user's reply or session variables.
     */
    private function evaluateConditions(string $userReply, array $conditions, ChatbotSession $session): ?int
    {
        $normalised = strtolower(trim($userReply));
        $variables = $session->variables_json ?? [];

        foreach ($conditions as $condition) {
            $type = $condition['type'] ?? 'equals';
            $value = strtolower(trim($condition['value'] ?? ''));
            $varName = $condition['variable'] ?? null;

            $subject = $varName ? strtolower(trim($variables[$varName] ?? '')) : $normalised;

            $matched = match ($type) {
                'equals' => $subject === $value,
                'contains' => str_contains($subject, $value),
                'starts_with' => str_starts_with($subject, $value),
                'regex' => (bool) @preg_match($condition['value'] ?? '', $subject),
                'greater_than' => is_numeric($subject) && is_numeric($value) && (float) $subject > (float) $value,
                'less_than' => is_numeric($subject) && is_numeric($value) && (float) $subject < (float) $value,
                'default' => true,
                default => false,
            };

            if ($matched) {
                return $condition['next_node_id'] ?? null;
            }
        }

        return null;
    }

    /**
     * Execute an action-type node (add to group, add tag, etc.).
     */
    private function executeAction(ChatbotNode $node, ChatbotSession $session): void
    {
        $action = $node->options_json ?? [];
        $actionType = $action['action'] ?? null;
        $phone = $session->contact_phone;

        // Find or create a contact for this phone
        $contact = Contact::withoutGlobalScopes()
            ->where('user_id', $session->user_id)
            ->where('phone', $phone)
            ->first();

        if (!$contact) {
            $contact = Contact::create([
                'user_id' => $session->user_id,
                'name' => $phone,
                'phone' => $phone,
            ]);
        }

        switch ($actionType) {
            case 'add_to_group':
                $groupId = $action['group_id'] ?? null;
                if ($groupId) {
                    $group = ContactGroup::withoutGlobalScopes()
                        ->where('user_id', $session->user_id)
                        ->find($groupId);
                    if ($group) {
                        $group->contacts()->syncWithoutDetaching([$contact->id]);
                        $group->updateContactCount();
                    }
                }
                break;

            case 'add_tag':
                $tag = $action['tag'] ?? null;
                if ($tag) {
                    $tags = $contact->tags ?? [];
                    if (!in_array($tag, $tags, true)) {
                        $tags[] = $tag;
                        $contact->update(['tags' => $tags]);
                    }
                }
                break;

            case 'remove_tag':
                $tag = $action['tag'] ?? null;
                if ($tag) {
                    $tags = $contact->tags ?? [];
                    $tags = array_values(array_filter($tags, fn ($t) => $t !== $tag));
                    $contact->update(['tags' => $tags]);
                }
                break;

            case 'set_variable':
                $varName = $action['variable'] ?? null;
                $varValue = $action['value'] ?? null;
                if ($varName !== null) {
                    $variables = $session->variables_json ?? [];
                    $variables[$varName] = $this->replaceVariables($varValue ?? '', $session);
                    $session->update(['variables_json' => $variables]);
                }
                break;

            case 'escalate':
                $session->update(['is_escalated' => true, 'is_active' => false]);
                break;

            default:
                Log::warning("ChatbotService: Unknown action type '{$actionType}' in node {$node->id}");
                break;
        }
    }

    // -------------------------------------------------------------------------
    // Office hours
    // -------------------------------------------------------------------------

    private function isWithinOfficeHours(ChatbotFlow $flow): bool
    {
        if (!$flow->office_hours_only) {
            return true;
        }

        $start = $flow->office_hours_start;
        $end = $flow->office_hours_end;

        if (!$start || !$end) {
            return true;
        }

        $now = Carbon::now()->format('H:i');

        if ($start <= $end) {
            return $now >= $start && $now <= $end;
        }

        // Overnight range (e.g., 22:00 - 06:00)
        return $now >= $start || $now <= $end;
    }

    // -------------------------------------------------------------------------
    // Escalation
    // -------------------------------------------------------------------------

    /**
     * Escalate the conversation to a human agent.
     */
    private function escalate(User $user, string $phone): string
    {
        // Deactivate the current chatbot session
        ChatbotSession::withoutGlobalScopes()
            ->where('user_id', $user->id)
            ->where('contact_phone', $phone)
            ->where('is_active', true)
            ->update([
                'is_active' => false,
                'is_escalated' => true,
            ]);

        return 'You have been connected to a human agent. Please wait for a response.';
    }

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    /**
     * Resolve the WaSession model from a ChatbotSession.
     */
    private function resolveWaSession(ChatbotSession $chatbotSession): ?WaSession
    {
        $flow = $chatbotSession->flow;
        if (!$flow || !$flow->session_id) {
            return null;
        }

        return WaSession::withoutGlobalScopes()->find($flow->session_id);
    }
}
