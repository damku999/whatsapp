<?php

namespace App\Http\Controllers\Internal;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\WaSession;
use App\Models\Webhook;
use App\Models\WebhookLog;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    /**
     * Handle inbound webhooks from the Node.js WhatsApp engine.
     *
     * Events: session.ready, session.disconnected, session.qr, session.pairing,
     *         message.received, message.status, group.join, group.leave
     */
    public function handle(Request $request)
    {
        // Verify the internal secret
        $secret = $request->header('X-Internal-Secret');

        if ($secret !== config('services.wa_engine.secret')) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data', []);

        Log::info("WA Engine Webhook: {$event}", $data);

        return match ($event) {
            'session.ready' => $this->handleSessionReady($data),
            'session.disconnected' => $this->handleSessionDisconnected($data),
            'session.qr' => $this->handleSessionQr($data),
            'session.pairing' => $this->handleSessionPairing($data),
            'message.received' => $this->handleMessageReceived($data),
            'message.status' => $this->handleMessageStatus($data),
            'group.join' => $this->handleGroupEvent('group.join', $data),
            'group.leave' => $this->handleGroupEvent('group.leave', $data),
            default => response()->json(['success' => true, 'message' => 'Event not handled']),
        };
    }

    // -------------------------------------------------------------------------
    // Session Events
    // -------------------------------------------------------------------------

    /**
     * Session authenticated and ready to send/receive messages.
     */
    private function handleSessionReady(array $data)
    {
        $session = $this->findSession($data);

        if (! $session) {
            return $this->sessionNotFound($data);
        }

        $session->update([
            'status' => 'active',
            'phone_number' => $data['phone_number'] ?? $session->phone_number,
            'profile_name' => $data['profile_name'] ?? $session->profile_name,
            'profile_picture_url' => $data['profile_picture_url'] ?? $session->profile_picture_url,
            'qr_code' => null,
            'pairing_code' => null,
            'last_active_at' => now(),
            'reconnect_attempts' => 0,
        ]);

        $this->forwardToClientWebhooks($session->user_id, 'session.ready', [
            'session_id' => $session->id,
            'phone_number' => $session->phone_number,
            'profile_name' => $session->profile_name,
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Session was disconnected from WhatsApp.
     */
    private function handleSessionDisconnected(array $data)
    {
        $session = $this->findSession($data);

        if (! $session) {
            return $this->sessionNotFound($data);
        }

        $session->update([
            'status' => 'disconnected',
            'qr_code' => null,
            'pairing_code' => null,
        ]);

        $this->forwardToClientWebhooks($session->user_id, 'session.disconnected', [
            'session_id' => $session->id,
            'reason' => $data['reason'] ?? 'unknown',
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Engine generated a new QR code for scanning.
     */
    private function handleSessionQr(array $data)
    {
        $session = $this->findSession($data);

        if (! $session) {
            return $this->sessionNotFound($data);
        }

        $session->update([
            'qr_code' => $data['qr_code'] ?? null,
            'status' => 'scanning',
        ]);

        return response()->json(['success' => true]);
    }

    /**
     * Engine generated a pairing code for phone-number auth.
     */
    private function handleSessionPairing(array $data)
    {
        $session = $this->findSession($data);

        if (! $session) {
            return $this->sessionNotFound($data);
        }

        $session->update([
            'pairing_code' => $data['pairing_code'] ?? null,
            'status' => 'scanning',
        ]);

        return response()->json(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Message Events
    // -------------------------------------------------------------------------

    /**
     * An incoming WhatsApp message was received by the engine.
     */
    private function handleMessageReceived(array $data)
    {
        $session = $this->findSession($data);

        if (! $session) {
            return $this->sessionNotFound($data);
        }

        // Prevent duplicate messages (engine might re-deliver)
        $existingWaId = $data['wa_message_id'] ?? $data['message_id'] ?? null;
        if ($existingWaId) {
            $existing = Message::withoutGlobalScopes()
                ->where('wa_message_id', $existingWaId)
                ->first();

            if ($existing) {
                return response()->json(['success' => true, 'message' => 'Duplicate ignored']);
            }
        }

        // Create the incoming message record
        $message = Message::withoutGlobalScopes()->create([
            'user_id' => $session->user_id,
            'session_id' => $session->id,
            'to_number' => $session->phone_number ?? '',
            'from_number' => $data['from'] ?? $data['from_number'] ?? '',
            'direction' => 'incoming',
            'message_type' => $data['type'] ?? 'text',
            'content' => $data['content'] ?? $data['body'] ?? null,
            'media_url' => $data['media_url'] ?? null,
            'wa_message_id' => $existingWaId,
            'status' => 'delivered',
            'delivered_at' => now(),
            'quoted_message_id' => $data['quoted_message_id'] ?? null,
            'metadata_json' => $data['metadata'] ?? null,
        ]);

        // Update session last active
        $session->update(['last_active_at' => now()]);

        // Check chatbot flows for auto-reply
        $this->triggerChatbotCheck($session, $message);

        // Forward to client's registered webhooks
        $this->forwardToClientWebhooks($session->user_id, 'message.received', [
            'message_id' => $message->id,
            'session_id' => $session->id,
            'from' => $message->from_number,
            'type' => $message->message_type,
            'content' => $message->content,
            'media_url' => $message->media_url,
            'wa_message_id' => $message->wa_message_id,
            'timestamp' => $message->created_at->toIso8601String(),
        ]);

        return response()->json(['success' => true, 'message_id' => $message->id]);
    }

    /**
     * Status update for a previously sent message (sent/delivered/read/failed).
     */
    private function handleMessageStatus(array $data)
    {
        $waMessageId = $data['wa_message_id'] ?? $data['message_id'] ?? null;

        if (! $waMessageId) {
            return response()->json(['success' => false, 'error' => 'Missing wa_message_id']);
        }

        $message = Message::withoutGlobalScopes()
            ->where('wa_message_id', $waMessageId)
            ->first();

        if (! $message) {
            Log::warning('WA Engine: message.status for unknown message', ['wa_message_id' => $waMessageId]);
            return response()->json(['success' => true, 'message' => 'Message not found']);
        }

        $newStatus = $data['status'] ?? null;
        $updateData = [];

        switch ($newStatus) {
            case 'sent':
                $updateData['status'] = 'sent';
                $updateData['sent_at'] = $message->sent_at ?? now();
                break;

            case 'delivered':
                $updateData['status'] = 'delivered';
                $updateData['delivered_at'] = $message->delivered_at ?? now();
                break;

            case 'read':
                $updateData['status'] = 'read';
                $updateData['read_at'] = $message->read_at ?? now();
                break;

            case 'failed':
                $updateData['status'] = 'failed';
                $updateData['error_msg'] = $data['error'] ?? 'Delivery failed';
                break;

            default:
                return response()->json(['success' => true, 'message' => 'Unknown status']);
        }

        if (! empty($updateData)) {
            $message->update($updateData);
        }

        // Forward status to client webhooks
        $this->forwardToClientWebhooks($message->user_id, 'message.status', [
            'message_id' => $message->id,
            'wa_message_id' => $message->wa_message_id,
            'status' => $newStatus,
            'timestamp' => now()->toIso8601String(),
        ]);

        return response()->json(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Group Events
    // -------------------------------------------------------------------------

    /**
     * Log group join/leave events.
     */
    private function handleGroupEvent(string $event, array $data)
    {
        $session = $this->findSession($data);

        Log::info("WA Engine {$event}", [
            'session_id' => $data['session_id'] ?? null,
            'group_id' => $data['group_id'] ?? null,
            'participant' => $data['participant'] ?? null,
            'user_id' => $session?->user_id,
        ]);

        if ($session) {
            $this->forwardToClientWebhooks($session->user_id, $event, [
                'session_id' => $session->id,
                'group_id' => $data['group_id'] ?? null,
                'participant' => $data['participant'] ?? null,
            ]);
        }

        return response()->json(['success' => true]);
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Find the WaSession by engine_session_id from the webhook data.
     */
    private function findSession(array $data): ?WaSession
    {
        $engineSessionId = $data['session_id'] ?? null;

        if (! $engineSessionId) {
            return null;
        }

        return WaSession::withoutGlobalScopes()
            ->where('engine_session_id', $engineSessionId)
            ->first();
    }

    /**
     * Return a 404 response when the session cannot be found.
     */
    private function sessionNotFound(array $data)
    {
        Log::warning('WA Engine webhook: session not found', [
            'session_id' => $data['session_id'] ?? null,
        ]);

        return response()->json(['success' => false, 'error' => 'Session not found'], 404);
    }

    /**
     * Check chatbot flows for matching triggers and auto-reply.
     * This is a basic implementation -- full chatbot logic will be built in a later milestone.
     */
    private function triggerChatbotCheck(WaSession $session, Message $message): void
    {
        if ($message->message_type !== 'text' || empty($message->content)) {
            return;
        }

        $flows = $session->chatbotFlows()
            ->where('is_active', true)
            ->orderBy('priority', 'asc')
            ->get();

        foreach ($flows as $flow) {
            $keyword = strtolower(trim($flow->trigger_keyword));
            $incoming = strtolower(trim($message->content));

            $matches = match ($flow->trigger_type) {
                'exact' => $incoming === $keyword,
                'contains' => str_contains($incoming, $keyword),
                'starts_with' => str_starts_with($incoming, $keyword),
                default => false,
            };

            if ($matches) {
                // If the flow has a fallback_message, send it as auto-reply
                if (! empty($flow->fallback_message)) {
                    $engine = app(WhatsAppEngineService::class);
                    $engine->sendMessage(
                        sessionId: $session->engine_session_id,
                        to: $message->from_number,
                        type: 'text',
                        content: $flow->fallback_message,
                    );

                    // Record the auto-reply in messages
                    Message::withoutGlobalScopes()->create([
                        'user_id' => $session->user_id,
                        'session_id' => $session->id,
                        'to_number' => $message->from_number,
                        'from_number' => $session->phone_number ?? '',
                        'direction' => 'outgoing',
                        'message_type' => 'text',
                        'content' => $flow->fallback_message,
                        'status' => 'sent',
                        'sent_at' => now(),
                        'metadata_json' => ['chatbot_flow_id' => $flow->id],
                    ]);
                }

                // Only match the first (highest-priority) flow
                break;
            }
        }
    }

    /**
     * Forward a webhook event to all of the user's active webhook endpoints.
     */
    private function forwardToClientWebhooks(int $userId, string $event, array $payload): void
    {
        $webhooks = Webhook::withoutGlobalScopes()
            ->where('user_id', $userId)
            ->where('is_active', true)
            ->get();

        foreach ($webhooks as $webhook) {
            // Check if the webhook is subscribed to this event
            if (! $webhook->supportsEvent($event)) {
                continue;
            }

            $fullPayload = [
                'event' => $event,
                'data' => $payload,
                'timestamp' => now()->toIso8601String(),
            ];

            try {
                $response = Http::timeout(10)
                    ->withHeaders([
                        'X-Webhook-Secret' => $webhook->secret ?? '',
                        'Content-Type' => 'application/json',
                    ])
                    ->post($webhook->url, $fullPayload);

                $responseCode = $response->status();
                $responseBody = $response->body();

                $webhook->update([
                    'last_triggered_at' => now(),
                    'last_response_code' => $responseCode,
                    'failure_count' => $responseCode >= 200 && $responseCode < 300
                        ? 0
                        : $webhook->failure_count + 1,
                ]);
            } catch (\Exception $e) {
                $responseCode = 0;
                $responseBody = $e->getMessage();

                $webhook->update([
                    'last_triggered_at' => now(),
                    'last_response_code' => 0,
                    'failure_count' => $webhook->failure_count + 1,
                ]);
            }

            // Log the webhook delivery attempt
            WebhookLog::create([
                'webhook_id' => $webhook->id,
                'event' => $event,
                'payload_json' => $fullPayload,
                'response_code' => $responseCode,
                'response_body' => \Illuminate\Support\Str::limit($responseBody ?? '', 2000),
                'sent_at' => now(),
            ]);
        }
    }
}
