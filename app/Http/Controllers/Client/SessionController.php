<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\WaSession;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SessionController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * List all sessions belonging to the authenticated user.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $sessions = $user->waSessions()
            ->latest()
            ->get()
            ->map(function (WaSession $session) {
                return [
                    'id' => $session->id,
                    'session_name' => $session->session_name,
                    'phone_number' => $session->phone_number,
                    'status' => $session->status,
                    'profile_name' => $session->profile_name,
                    'profile_picture_url' => $session->profile_picture_url,
                    'last_active_at' => $session->last_active_at?->toIso8601String(),
                    'created_at' => $session->created_at->toIso8601String(),
                ];
            });

        return Inertia::render('Sessions/Index', [
            'sessions' => $sessions,
        ]);
    }

    /**
     * Create a new WhatsApp session and start it on the engine.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'session_name' => ['required', 'string', 'max:100'],
            'auth_type' => ['required', 'string', 'in:qr,pairing'],
        ]);

        $user = $request->user();

        // Enforce plan session limit
        $plan = $user->plan;
        $maxSessions = $plan?->max_sessions ?? 1;
        $currentCount = $user->waSessions()->count();

        if ($currentCount >= $maxSessions) {
            return back()->withErrors([
                'session_name' => "Your plan allows a maximum of {$maxSessions} session(s). Please upgrade or remove an existing session.",
            ]);
        }

        // Generate a unique engine session ID
        $engineSessionId = 'wa_' . $user->id . '_' . Str::random(12);

        // Create local DB record
        $session = $user->waSessions()->create([
            'session_name' => $validated['session_name'],
            'status' => 'pending',
            'engine_session_id' => $engineSessionId,
        ]);

        // Tell the engine to start the session
        $result = $this->engine->startSession($engineSessionId, $validated['auth_type']);

        if (isset($result['success']) && $result['success'] === false) {
            // Engine failed but we keep the DB record in pending state for retry
            return back()->withErrors([
                'session_name' => 'Failed to start session on engine: ' . ($result['error'] ?? 'Unknown error'),
            ]);
        }

        // If engine returned QR or pairing code immediately, store it
        if (isset($result['qr_code'])) {
            $session->update(['qr_code' => $result['qr_code'], 'status' => 'scanning']);
        }

        if (isset($result['pairing_code'])) {
            $session->update(['pairing_code' => $result['pairing_code'], 'status' => 'scanning']);
        }

        return back()->with('success', 'Session created. Scan the QR code or enter the pairing code on your phone.');
    }

    /**
     * Poll for the latest QR code / session status (used by frontend polling).
     */
    public function qr(WaSession $session)
    {
        // The BelongsToUser scope already restricts to the current user
        $engineStatus = $this->engine->getSessionStatus($session->engine_session_id);

        // Sync QR code from engine response
        $updateData = [];

        if (isset($engineStatus['qr_code'])) {
            $updateData['qr_code'] = $engineStatus['qr_code'];
        }

        if (isset($engineStatus['pairing_code'])) {
            $updateData['pairing_code'] = $engineStatus['pairing_code'];
        }

        if (isset($engineStatus['status'])) {
            $mappedStatus = $this->mapEngineStatus($engineStatus['status']);
            if ($mappedStatus !== null) {
                $updateData['status'] = $mappedStatus;
            }
        }

        if (! empty($updateData)) {
            $session->update($updateData);
            $session->refresh();
        }

        return response()->json([
            'status' => $session->status,
            'qr_code' => $session->qr_code,
            'pairing_code' => $session->pairing_code,
            'phone_number' => $session->phone_number,
            'profile_name' => $session->profile_name,
        ]);
    }

    /**
     * Disconnect a session from WhatsApp.
     */
    public function disconnect(WaSession $session)
    {
        if ($session->engine_session_id) {
            $this->engine->disconnectSession($session->engine_session_id);
        }

        $session->update([
            'status' => 'disconnected',
            'qr_code' => null,
            'pairing_code' => null,
        ]);

        return back()->with('success', 'Session disconnected successfully.');
    }

    /**
     * Delete a session entirely (disconnect from engine + remove DB record).
     */
    public function destroy(WaSession $session)
    {
        // Disconnect from engine first if there is an active connection
        if ($session->engine_session_id && $session->status !== 'disconnected') {
            $this->engine->disconnectSession($session->engine_session_id);
        }

        $session->delete();

        return back()->with('success', 'Session deleted successfully.');
    }

    // -------------------------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------------------------

    /**
     * Map engine status strings to our local enum values.
     */
    private function mapEngineStatus(string $engineStatus): ?string
    {
        return match ($engineStatus) {
            'ready', 'active', 'connected' => 'active',
            'qr', 'scanning', 'pairing' => 'scanning',
            'disconnected', 'closed' => 'disconnected',
            'banned' => 'banned',
            'pending', 'initializing' => 'pending',
            default => null,
        };
    }
}
