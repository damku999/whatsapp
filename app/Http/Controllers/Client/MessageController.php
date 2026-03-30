<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\WaSession;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class MessageController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * Compose message page with available sessions.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $sessions = $user->waSessions()
            ->where('status', 'active')
            ->get(['id', 'session_name', 'phone_number', 'engine_session_id']);

        return Inertia::render('Messages/Index', [
            'sessions' => $sessions,
        ]);
    }

    /**
     * Send a single message through the WhatsApp engine.
     */
    public function send(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'session_id' => ['required', 'integer', Rule::exists('wa_sessions', 'id')],
            'to_number' => ['required', 'string', 'max:20', 'regex:/^\d{7,15}$/'],
            'message_type' => ['required', 'string', Rule::in([
                'text', 'image', 'video', 'audio', 'document',
                'location', 'contact', 'sticker',
            ])],
            'content' => ['nullable', 'string', 'max:10000'],
            'media' => ['nullable', 'file', 'max:16384'], // 16MB max
        ]);

        // Verify the session belongs to this user and is active
        $session = $user->waSessions()
            ->where('id', $validated['session_id'])
            ->where('status', 'active')
            ->first();

        if (! $session) {
            return back()->withErrors(['session_id' => 'Selected session is not active or does not exist.']);
        }

        // Check daily message limit
        if (! $user->canSendMessage()) {
            return back()->withErrors(['content' => 'Daily message limit reached. Please upgrade your plan or try again tomorrow.']);
        }

        // Handle media upload
        $mediaPath = null;
        $mediaUrl = null;

        if ($request->hasFile('media')) {
            $file = $request->file('media');
            $mediaPath = $file->store("media/{$user->id}", 'public');
            $mediaUrl = Storage::disk('public')->url($mediaPath);
        }

        // For non-text messages, media is required
        if ($validated['message_type'] !== 'text' && $mediaUrl === null && empty($validated['content'])) {
            return back()->withErrors(['media' => 'Media file is required for this message type.']);
        }

        // For text messages, content is required
        if ($validated['message_type'] === 'text' && empty($validated['content'])) {
            return back()->withErrors(['content' => 'Message content is required for text messages.']);
        }

        // Send through the engine
        $result = $this->engine->sendMessage(
            sessionId: $session->engine_session_id,
            to: $validated['to_number'],
            type: $validated['message_type'],
            content: $validated['content'] ?? null,
            mediaUrl: $mediaUrl,
        );

        // Determine status based on engine response
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

        // Create the message record
        $message = Message::create([
            'user_id' => $user->id,
            'session_id' => $session->id,
            'to_number' => $validated['to_number'],
            'from_number' => $session->phone_number,
            'direction' => 'outgoing',
            'message_type' => $validated['message_type'],
            'content' => $validated['content'] ?? null,
            'media_path' => $mediaPath,
            'media_url' => $mediaUrl,
            'wa_message_id' => $waMessageId,
            'status' => $status,
            'error_msg' => $errorMsg,
            'sent_at' => $status === 'sent' ? now() : null,
        ]);

        if ($status === 'failed') {
            return back()->withErrors(['content' => 'Message failed to send: ' . $errorMsg]);
        }

        return back()->with('success', 'Message sent successfully.');
    }

    /**
     * Paginated message history with filters.
     */
    public function history(Request $request)
    {
        $user = $request->user();

        $query = $user->messages()->with('session:id,session_name');

        // Filter by status
        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        // Filter by direction
        if ($request->filled('direction')) {
            $query->where('direction', $request->input('direction'));
        }

        // Filter by phone number (partial match)
        if ($request->filled('phone')) {
            $phone = $request->input('phone');
            $query->where(function ($q) use ($phone) {
                $q->where('to_number', 'like', "%{$phone}%")
                    ->orWhere('from_number', 'like', "%{$phone}%");
            });
        }

        // Filter by date range
        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        // Filter by session
        if ($request->filled('session_id')) {
            $query->where('session_id', $request->input('session_id'));
        }

        $messages = $query->latest()->paginate(25)->withQueryString();

        $sessions = $user->waSessions()->get(['id', 'session_name']);

        return Inertia::render('Messages/History', [
            'messages' => $messages,
            'sessions' => $sessions,
            'filters' => $request->only(['status', 'direction', 'phone', 'date_from', 'date_to', 'session_id']),
        ]);
    }
}
