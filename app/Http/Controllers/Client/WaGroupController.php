<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\WaSession;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class WaGroupController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * List WhatsApp groups from the engine for the selected session.
     */
    public function index(Request $request)
    {
        $sessions = WaSession::where('status', 'active')->get();

        $groups = [];
        $selectedSessionId = $request->input('session_id');

        if ($selectedSessionId) {
            $session = WaSession::findOrFail($selectedSessionId);

            $result = $this->engine->getGroups($session->engine_session_id);

            if (!empty($result['error'])) {
                return Inertia::render('WaGroups/Index', [
                    'sessions' => $sessions,
                    'groups' => [],
                    'selectedSessionId' => (int) $selectedSessionId,
                    'error' => 'Failed to fetch WhatsApp groups: ' . $result['error'],
                ]);
            }

            $groups = $result;
        }

        return Inertia::render('WaGroups/Index', [
            'sessions' => $sessions,
            'groups' => $groups,
            'selectedSessionId' => $selectedSessionId ? (int) $selectedSessionId : null,
        ]);
    }

    /**
     * Send a message to a WhatsApp group.
     */
    public function send(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'group_jid' => 'required|string',
            'message' => 'required|string|max:4096',
            'media' => 'nullable|file|max:16384',
        ]);

        $session = WaSession::findOrFail($validated['session_id']);

        $mediaUrl = null;
        if ($request->hasFile('media')) {
            $path = $request->file('media')->store(
                'campaign-media/' . Auth::id(),
                'public'
            );
            $mediaUrl = asset('storage/' . $path);
        }

        $result = $this->engine->sendGroupMessage(
            sessionId: $session->engine_session_id,
            groupJid: $validated['group_jid'],
            content: $validated['message'],
            mediaUrl: $mediaUrl,
        );

        if (!empty($result['error'])) {
            return redirect()->back()->withErrors(['message' => 'Failed to send message: ' . $result['error']]);
        }

        return redirect()->back()->with('success', 'Message sent to group successfully.');
    }

    /**
     * Extract members from a WhatsApp group and create Contact records.
     */
    public function extractMembers(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'group_jid' => 'required|string',
        ]);

        $session = WaSession::findOrFail($validated['session_id']);

        $result = $this->engine->getGroupMembers(
            $session->engine_session_id,
            $validated['group_jid'],
        );

        if (!empty($result['error'])) {
            return redirect()->back()->withErrors(['group_jid' => 'Failed to extract members: ' . $result['error']]);
        }

        $members = is_array($result) ? $result : [];
        $userId = Auth::id();
        $created = 0;
        $skipped = 0;

        foreach ($members as $member) {
            $phone = $member['phone'] ?? $member['id'] ?? null;

            if (empty($phone)) {
                $skipped++;
                continue;
            }

            // Normalise phone: strip @s.whatsapp.net suffix if present
            $phone = preg_replace('/@s\.whatsapp\.net$/', '', $phone);

            $exists = Contact::withoutGlobalScopes()
                ->where('user_id', $userId)
                ->where('phone', $phone)
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            Contact::create([
                'user_id' => $userId,
                'name' => $member['name'] ?? $member['pushname'] ?? $phone,
                'phone' => $phone,
            ]);
            $created++;
        }

        return redirect()->back()->with('success', "Extracted members: {$created} created, {$skipped} already existed.");
    }

    /**
     * Create a new WhatsApp group via the engine.
     */
    public function create(Request $request)
    {
        $validated = $request->validate([
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'name' => 'required|string|max:100',
            'participants' => 'required|array|min:1',
            'participants.*' => 'string',
        ]);

        $session = WaSession::findOrFail($validated['session_id']);

        $result = $this->engine->createGroup(
            sessionId: $session->engine_session_id,
            name: $validated['name'],
            participants: $validated['participants'],
        );

        if (!empty($result['error'])) {
            return redirect()->back()->withErrors(['name' => 'Failed to create group: ' . $result['error']]);
        }

        return redirect()->back()->with('success', "WhatsApp group '{$validated['name']}' created successfully.");
    }
}
