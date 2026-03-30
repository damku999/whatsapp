<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WhatsAppEngineService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionApiController extends Controller
{
    public function __construct(
        private WhatsAppEngineService $engine,
    ) {}

    /**
     * Get status of all user sessions.
     *
     * GET /api/v1/session/status
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        $sessions = $user->waSessions()->get();

        $sessionData = $sessions->map(function ($session) {
            $engineStatus = null;

            if ($session->engine_session_id) {
                try {
                    $engineStatus = $this->engine->getSessionStatus($session->engine_session_id);
                } catch (\Exception $e) {
                    $engineStatus = ['status' => 'unknown', 'error' => $e->getMessage()];
                }
            }

            return [
                'id' => $session->id,
                'session_name' => $session->session_name,
                'phone_number' => $session->phone_number,
                'status' => $session->status,
                'profile_name' => $session->profile_name,
                'last_active_at' => $session->last_active_at,
                'engine_status' => $engineStatus['status'] ?? $session->status,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $sessionData,
            'message' => 'Session statuses retrieved successfully.',
        ]);
    }

    /**
     * Check if a phone number is registered on WhatsApp.
     *
     * GET /api/v1/number/check
     */
    public function checkNumber(Request $request): JsonResponse
    {
        $request->validate([
            'phone' => 'required|string|max:20|regex:/^\+?[1-9]\d{6,14}$/',
        ]);

        $user = $request->user();

        // Find the user's first active session for the check
        $session = $user->waSessions()->where('status', 'active')->first();

        if (!$session) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No active WhatsApp session found. Please connect a session first.',
            ], 422);
        }

        $result = $this->engine->checkNumber($session->engine_session_id, $request->input('phone'));

        if (!empty($result['error'])) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Number check failed: ' . $result['error'],
            ], 500);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'phone' => $request->input('phone'),
                'registered' => $result['registered'] ?? $result['exists'] ?? false,
                'jid' => $result['jid'] ?? null,
            ],
            'message' => 'Number check completed.',
        ]);
    }
}
