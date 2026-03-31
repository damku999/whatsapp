<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InboxController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * Inbox page showing conversation threads grouped by contact phone number.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        // Build conversations: group messages by contact phone, get latest message and unread count.
        // The "contact phone" is to_number for outgoing, from_number for incoming.
        $conversations = $this->getConversations($user);

        $sessions = $user->waSessions()
            ->where('status', 'active')
            ->get(['id', 'session_name', 'phone_number', 'engine_session_id']);

        return Inertia::render('Inbox/Index', [
            'conversations' => $conversations,
            'sessions' => $sessions,
        ]);
    }

    /**
     * Show a single conversation thread with a specific phone number.
     */
    public function show(Request $request, string $phone)
    {
        $user = $request->user();

        // Get messages with this contact (both directions)
        $messages = $user->messages()
            ->where(function ($query) use ($phone) {
                $query->where(function ($q) use ($phone) {
                    $q->where('direction', 'outgoing')->where('to_number', $phone);
                })->orWhere(function ($q) use ($phone) {
                    $q->where('direction', 'incoming')->where('from_number', $phone);
                });
            })
            ->with('session:id,session_name')
            ->orderBy('created_at', 'asc')
            ->paginate(50);

        // Mark incoming messages from this contact as read
        $user->messages()
            ->where('direction', 'incoming')
            ->where('from_number', $phone)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        $sessions = $user->waSessions()
            ->where('status', 'active')
            ->get(['id', 'session_name', 'phone_number', 'engine_session_id']);

        // Find the contact name if they exist in the contacts table
        $contact = $user->contacts()
            ->where('phone', $phone)
            ->first(['id', 'name', 'phone']);

        return Inertia::render('Inbox/Show', [
            'phone' => $phone,
            'contact' => $contact,
            'messages' => $messages,
            'sessions' => $sessions,
        ]);
    }

    /**
     * Reply to a conversation thread.
     */
    public function reply(Request $request, string $phone)
    {
        $user = $request->user();

        $validated = $request->validate([
            'session_id' => ['required', 'integer', 'exists:wa_sessions,id'],
            'content' => ['required', 'string', 'max:10000'],
            'message_type' => ['sometimes', 'string', 'in:text,image,video,audio,document'],
        ]);

        // Verify the session belongs to the user and is active
        $session = $user->waSessions()
            ->where('id', $validated['session_id'])
            ->where('status', 'active')
            ->first();

        if (! $session) {
            return back()->withErrors(['session_id' => 'Selected session is not active.']);
        }

        // Check daily message limit
        if (! $user->canSendMessage()) {
            return back()->withErrors(['content' => 'Daily message limit reached.']);
        }

        $messageType = $validated['message_type'] ?? 'text';

        // Send through the engine
        $result = $this->engine->sendMessage(
            sessionId: $session->engine_session_id,
            to: $phone,
            type: $messageType,
            content: $validated['content'],
        );

        $status = 'queued';
        $waMessageId = null;
        $errorMsg = null;

        if (isset($result['success']) && $result['success'] === false) {
            $status = 'failed';
            $errorMsg = $result['error'] ?? 'Engine send failed';
        } elseif (isset($result['message_id'])) {
            $waMessageId = $result['message_id'];
            $status = 'sent';
        }

        Message::create([
            'user_id' => $user->id,
            'session_id' => $session->id,
            'to_number' => $phone,
            'from_number' => $session->phone_number,
            'direction' => 'outgoing',
            'message_type' => $messageType,
            'content' => $validated['content'],
            'wa_message_id' => $waMessageId,
            'status' => $status,
            'error_msg' => $errorMsg,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);

        if ($status === 'failed') {
            return back()->withErrors(['content' => 'Failed to send reply: ' . $errorMsg]);
        }

        return back()->with('success', 'Reply sent.');
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Build a list of conversation threads for the inbox sidebar.
     *
     * Each conversation has: phone, contact_name, latest_message, latest_at, unread_count, direction.
     */
    private function getConversations($user): array
    {
        // Use a subquery to determine the "contact phone" for each message:
        // outgoing -> to_number, incoming -> from_number
        $rawMessages = $user->messages()
            ->select([
                DB::raw("CASE WHEN direction = 'outgoing' THEN to_number ELSE from_number END as contact_phone"),
                'id',
                'content',
                'message_type',
                'direction',
                'status',
                'read_at',
                'created_at',
            ])
            ->latest()
            ->get();

        // Group by contact phone and take the latest message per contact
        $grouped = $rawMessages->groupBy('contact_phone');

        $conversations = [];

        foreach ($grouped as $phone => $messages) {
            if (empty($phone)) {
                continue;
            }

            $latest = $messages->first(); // already sorted by created_at desc
            $unreadCount = $messages
                ->where('direction', 'incoming')
                ->whereNull('read_at')
                ->count();

            // Try to find a contact name
            $contact = $user->contacts()
                ->where('phone', $phone)
                ->first(['name']);

            $conversations[] = [
                'phone' => $phone,
                'contact_name' => $contact?->name,
                'latest_message' => $latest->message_type === 'text'
                    ? \Illuminate\Support\Str::limit($latest->content, 80)
                    : '[' . ucfirst($latest->message_type) . ']',
                'latest_at' => $latest->created_at->toIso8601String(),
                'unread_count' => $unreadCount,
                'direction' => $latest->direction,
            ];
        }

        // Sort by latest_at descending
        usort($conversations, fn ($a, $b) => strcmp($b['latest_at'], $a['latest_at']));

        return $conversations;
    }
}
