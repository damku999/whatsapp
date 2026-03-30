<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCampaign;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CampaignController extends Controller
{
    /**
     * List campaigns with pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'per_page' => 'nullable|integer|min:1|max:100',
            'status' => 'nullable|in:draft,scheduled,running,paused,completed,cancelled,failed',
        ]);

        $perPage = (int) $request->input('per_page', 20);

        $query = $request->user()->campaigns()->latest();

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        $campaigns = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $campaigns,
            'message' => 'Campaigns retrieved successfully.',
        ]);
    }

    /**
     * Create a new campaign and dispatch it.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'message_body' => 'required|string|max:4096',
            'type' => 'nullable|in:text,image,document,video,audio',
            'session_id' => 'nullable|integer|exists:wa_sessions,id',
            'contact_ids' => 'required|array|min:1|max:10000',
            'contact_ids.*' => 'integer|exists:contacts,id',
            'delay_min' => 'nullable|integer|min:1|max:300',
            'delay_max' => 'nullable|integer|min:1|max:600',
            'media_path' => 'nullable|string|max:500',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $user = $request->user();

        // Resolve session - use provided or first active session
        $sessionId = $validated['session_id'] ?? null;

        if (!$sessionId) {
            $session = $user->waSessions()->where('status', 'active')->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'No active WhatsApp session found. Please connect a session first.',
                ], 422);
            }

            $sessionId = $session->id;
        } else {
            // Verify session belongs to user and is active
            $session = $user->waSessions()->where('id', $sessionId)->first();

            if (!$session) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'Session not found.',
                ], 404);
            }

            if (!$session->isActive()) {
                return response()->json([
                    'success' => false,
                    'data' => null,
                    'message' => 'The selected session is not active.',
                ], 422);
            }
        }

        // Verify contact_ids belong to the user and get their phone numbers
        $contacts = $user->contacts()
            ->whereIn('id', $validated['contact_ids'])
            ->where('opted_out', false)
            ->get(['id', 'phone']);

        if ($contacts->isEmpty()) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'No valid, non-opted-out contacts found.',
            ], 422);
        }

        $delayMin = $validated['delay_min'] ?? 5;
        $delayMax = $validated['delay_max'] ?? 15;

        if ($delayMax < $delayMin) {
            $delayMax = $delayMin;
        }

        $scheduledAt = isset($validated['scheduled_at']) ? $validated['scheduled_at'] : null;
        $initialStatus = $scheduledAt ? 'scheduled' : 'running';

        // Create the campaign
        $campaign = $user->campaigns()->create([
            'session_id' => $sessionId,
            'name' => $validated['name'] ?? 'API Campaign ' . now()->format('Y-m-d H:i'),
            'type' => $validated['type'] ?? 'text',
            'message_body' => $validated['message_body'],
            'media_path' => $validated['media_path'] ?? null,
            'delay_min' => $delayMin,
            'delay_max' => $delayMax,
            'total_count' => $contacts->count(),
            'sent_count' => 0,
            'failed_count' => 0,
            'status' => $initialStatus,
            'scheduled_at' => $scheduledAt,
            'started_at' => $scheduledAt ? null : now(),
        ]);

        // Create campaign recipients
        $recipientData = $contacts->map(function ($contact) {
            return [
                'contact_id' => $contact->id,
                'phone' => $contact->phone,
                'status' => 'pending',
            ];
        })->toArray();

        $campaign->recipients()->createMany($recipientData);

        // Dispatch campaign processing
        if ($scheduledAt) {
            ProcessCampaign::dispatch($campaign)->delay(new \DateTime($scheduledAt));
        } else {
            ProcessCampaign::dispatch($campaign);
        }

        return response()->json([
            'success' => true,
            'data' => [
                'campaign_id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'total_recipients' => $campaign->total_count,
                'scheduled_at' => $campaign->scheduled_at,
            ],
            'message' => 'Campaign created and queued for processing.',
        ], 201);
    }

    /**
     * Show a single campaign with recipients and progress.
     */
    public function show(Request $request, $id): JsonResponse
    {
        $campaign = $request->user()
            ->campaigns()
            ->withCount([
                'recipients as pending_count' => function ($q) {
                    $q->where('status', 'pending');
                },
                'recipients as sent_count' => function ($q) {
                    $q->where('status', 'sent');
                },
                'recipients as failed_count' => function ($q) {
                    $q->where('status', 'failed');
                },
            ])
            ->findOrFail($id);

        $campaign->load(['recipients' => function ($query) {
            $query->select('id', 'campaign_id', 'phone', 'status', 'sent_at', 'error_msg')
                  ->orderBy('status')
                  ->orderBy('sent_at', 'desc');
        }]);

        $data = $campaign->toArray();
        $data['progress'] = $campaign->progress();

        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => 'Campaign retrieved successfully.',
        ]);
    }

    /**
     * Get campaign status and progress summary.
     */
    public function status(Request $request, $id): JsonResponse
    {
        $campaign = $request->user()->campaigns()->findOrFail($id);

        return response()->json([
            'success' => true,
            'data' => [
                'campaign_id' => $campaign->id,
                'name' => $campaign->name,
                'status' => $campaign->status,
                'total_count' => $campaign->total_count,
                'sent_count' => $campaign->sent_count,
                'failed_count' => $campaign->failed_count,
                'progress' => $campaign->progress(),
                'started_at' => $campaign->started_at,
                'completed_at' => $campaign->completed_at,
            ],
            'message' => 'Campaign status retrieved successfully.',
        ]);
    }
}
