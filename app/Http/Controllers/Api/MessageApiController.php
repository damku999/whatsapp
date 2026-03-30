<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCampaign;
use App\Models\Message;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessageApiController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * Send a single message.
     *
     * POST /api/v1/message/send
     */
    public function send(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => 'required|string|max:20|regex:/^\+?[1-9]\d{6,14}$/',
            'type' => 'nullable|in:text,image,document,video,audio',
            'content' => 'required_if:type,text|nullable|string|max:4096',
            'session_id' => 'nullable|integer|exists:wa_sessions,id',
            'media_url' => 'nullable|url|max:2048',
            'quoted_msg_id' => 'nullable|string|max:255',
        ]);

        $user = $request->user();
        $type = $validated['type'] ?? 'text';

        // Verify user can send messages
        if (!$user->canSendMessage()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Daily message limit reached or no active subscription.',
            ], 429);
        }

        // Resolve session
        $session = $this->resolveSession($user, $validated['session_id'] ?? null);

        if (!$session) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No active WhatsApp session found.',
            ], 422);
        }

        // Send via engine
        $result = $this->engine->sendMessage(
            sessionId: $session->engine_session_id,
            to: $validated['to'],
            type: $type,
            content: $validated['content'] ?? null,
            mediaUrl: $validated['media_url'] ?? null,
            quotedMsgId: $validated['quoted_msg_id'] ?? null,
        );

        if (!empty($result['error'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to send message: ' . $result['error'],
            ], 500);
        }

        // Create message record
        $message = Message::create([
            'user_id' => $user->id,
            'session_id' => $session->id,
            'to_number' => $validated['to'],
            'from_number' => $session->phone_number,
            'direction' => 'outgoing',
            'message_type' => $type,
            'content' => $validated['content'] ?? null,
            'media_url' => $validated['media_url'] ?? null,
            'wa_message_id' => $result['messageId'] ?? $result['message_id'] ?? null,
            'status' => 'sent',
            'sent_at' => now(),
            'quoted_message_id' => $validated['quoted_msg_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'message_id' => $message->id,
                'wa_message_id' => $message->wa_message_id,
                'status' => $message->status,
            ],
            'message' => 'Message sent successfully.',
        ]);
    }

    /**
     * Send a media message.
     *
     * POST /api/v1/message/send-media
     */
    public function sendMedia(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'to' => 'required|string|max:20|regex:/^\+?[1-9]\d{6,14}$/',
            'type' => 'required|in:image,document,video,audio',
            'content' => 'nullable|string|max:4096',
            'session_id' => 'nullable|integer|exists:wa_sessions,id',
            'media_url' => 'required|url|max:2048',
            'quoted_msg_id' => 'nullable|string|max:255',
        ]);

        $user = $request->user();

        if (!$user->canSendMessage()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Daily message limit reached or no active subscription.',
            ], 429);
        }

        $session = $this->resolveSession($user, $validated['session_id'] ?? null);

        if (!$session) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No active WhatsApp session found.',
            ], 422);
        }

        $result = $this->engine->sendMessage(
            sessionId: $session->engine_session_id,
            to: $validated['to'],
            type: $validated['type'],
            content: $validated['content'] ?? null,
            mediaUrl: $validated['media_url'],
            quotedMsgId: $validated['quoted_msg_id'] ?? null,
        );

        if (!empty($result['error'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to send media message: ' . $result['error'],
            ], 500);
        }

        $message = Message::create([
            'user_id' => $user->id,
            'session_id' => $session->id,
            'to_number' => $validated['to'],
            'from_number' => $session->phone_number,
            'direction' => 'outgoing',
            'message_type' => $validated['type'],
            'content' => $validated['content'] ?? null,
            'media_url' => $validated['media_url'],
            'wa_message_id' => $result['messageId'] ?? $result['message_id'] ?? null,
            'status' => 'sent',
            'sent_at' => now(),
            'quoted_message_id' => $validated['quoted_msg_id'] ?? null,
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'message_id' => $message->id,
                'wa_message_id' => $message->wa_message_id,
                'status' => $message->status,
            ],
            'message' => 'Media message sent successfully.',
        ]);
    }

    /**
     * Send bulk messages by creating a campaign.
     *
     * POST /api/v1/message/send-bulk
     */
    public function sendBulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'recipients' => 'required|array|min:1|max:10000',
            'recipients.*' => 'string|max:20|regex:/^\+?[1-9]\d{6,14}$/',
            'content' => 'required|string|max:4096',
            'type' => 'nullable|in:text,image,document,video,audio',
            'session_id' => 'nullable|integer|exists:wa_sessions,id',
            'media_url' => 'nullable|url|max:2048',
            'delay_min' => 'nullable|integer|min:1|max:300',
            'delay_max' => 'nullable|integer|min:1|max:600',
        ]);

        $user = $request->user();
        $type = $validated['type'] ?? 'text';

        if (!$user->canSendMessage()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Daily message limit reached or no active subscription.',
            ], 429);
        }

        $session = $this->resolveSession($user, $validated['session_id'] ?? null);

        if (!$session) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No active WhatsApp session found.',
            ], 422);
        }

        $recipients = array_unique($validated['recipients']);
        $delayMin = $validated['delay_min'] ?? 5;
        $delayMax = $validated['delay_max'] ?? 15;

        if ($delayMax < $delayMin) {
            $delayMax = $delayMin;
        }

        // Create campaign
        $campaign = $user->campaigns()->create([
            'session_id' => $session->id,
            'name' => 'Bulk API ' . now()->format('Y-m-d H:i'),
            'type' => $type,
            'message_body' => $validated['content'],
            'media_path' => $validated['media_url'] ?? null,
            'delay_min' => $delayMin,
            'delay_max' => $delayMax,
            'total_count' => count($recipients),
            'sent_count' => 0,
            'failed_count' => 0,
            'status' => 'running',
            'started_at' => now(),
        ]);

        // Create campaign recipients from phone numbers
        $recipientData = [];

        foreach ($recipients as $phone) {
            // Try to match existing contact
            $contact = $user->contacts()->where('phone', $phone)->first();

            $recipientData[] = [
                'contact_id' => $contact?->id,
                'phone' => $phone,
                'status' => 'pending',
            ];
        }

        $campaign->recipients()->createMany($recipientData);

        // Dispatch the campaign job
        ProcessCampaign::dispatch($campaign);

        return response()->json([
            'success' => true,
            'data' => [
                'campaign_id' => $campaign->id,
                'queued' => count($recipients),
                'status' => 'running',
            ],
            'message' => 'Bulk messages queued for delivery.',
        ], 201);
    }

    /**
     * Get the delivery status of a message.
     *
     * GET /api/v1/message/{id}/status
     */
    public function status(Request $request, $id): JsonResponse
    {
        $message = $request->user()
            ->messages()
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'message_id' => $message->id,
                'wa_message_id' => $message->wa_message_id,
                'status' => $message->status,
                'to_number' => $message->to_number,
                'direction' => $message->direction,
                'type' => $message->message_type,
                'sent_at' => $message->sent_at,
                'delivered_at' => $message->delivered_at,
                'read_at' => $message->read_at,
                'error_msg' => $message->error_msg,
            ],
            'message' => 'Message status retrieved successfully.',
        ]);
    }

    /**
     * Resolve the WhatsApp session to use for sending.
     */
    private function resolveSession($user, ?int $sessionId): ?\App\Models\WaSession
    {
        if ($sessionId) {
            $session = $user->waSessions()->where('id', $sessionId)->first();

            if ($session && $session->isActive()) {
                return $session;
            }

            return null;
        }

        return $user->waSessions()->where('status', 'active')->first();
    }
}
