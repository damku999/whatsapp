<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\WebhookLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class WebhookManagementController extends Controller
{
    /**
     * Display a listing of webhooks.
     */
    public function index(Request $request): Response
    {
        $webhooks = $request->user()
            ->webhooks()
            ->withCount('logs')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('Webhooks/Index', [
            'webhooks' => $webhooks,
            'availableEvents' => $this->availableEvents(),
        ]);
    }

    /**
     * Store a newly created webhook.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'url' => 'required|url|max:2048',
            'events' => 'required|array|min:1',
            'events.*' => 'string|in:' . implode(',', array_keys($this->availableEvents())),
        ]);

        $request->user()->webhooks()->create([
            'url' => $validated['url'],
            'events_json' => $validated['events'],
            'secret' => bin2hex(random_bytes(32)),
            'is_active' => true,
        ]);

        return redirect()->route('webhooks.index')
            ->with('success', 'Webhook created successfully.');
    }

    /**
     * Update the specified webhook.
     */
    public function update(Request $request, $id): RedirectResponse
    {
        $webhook = $request->user()->webhooks()->findOrFail($id);

        $validated = $request->validate([
            'url' => 'sometimes|required|url|max:2048',
            'events' => 'sometimes|required|array|min:1',
            'events.*' => 'string|in:' . implode(',', array_keys($this->availableEvents())),
            'is_active' => 'nullable|boolean',
        ]);

        $updateData = [];

        if (isset($validated['url'])) {
            $updateData['url'] = $validated['url'];
        }

        if (isset($validated['events'])) {
            $updateData['events_json'] = $validated['events'];
        }

        if (isset($validated['is_active'])) {
            $updateData['is_active'] = $validated['is_active'];
        }

        $webhook->update($updateData);

        return redirect()->route('webhooks.index')
            ->with('success', 'Webhook updated successfully.');
    }

    /**
     * Remove the specified webhook.
     */
    public function destroy(Request $request, $id): RedirectResponse
    {
        $webhook = $request->user()->webhooks()->findOrFail($id);
        $webhook->logs()->delete();
        $webhook->delete();

        return redirect()->route('webhooks.index')
            ->with('success', 'Webhook deleted successfully.');
    }

    /**
     * Send a test payload to the webhook.
     */
    public function test(Request $request, $id)
    {
        $webhook = $request->user()->webhooks()->findOrFail($id);

        $testPayload = [
            'event' => 'test',
            'timestamp' => now()->toIso8601String(),
            'data' => [
                'message' => 'This is a test webhook delivery from WhatsApp Monks.',
                'webhook_id' => $webhook->id,
            ],
        ];

        $signature = hash_hmac('sha256', json_encode($testPayload), $webhook->secret);

        try {
            $response = Http::timeout(10)
                ->withHeaders([
                    'Content-Type' => 'application/json',
                    'X-Webhook-Signature' => $signature,
                    'X-Webhook-Id' => (string) $webhook->id,
                    'User-Agent' => 'WhatsAppMonks-Webhook/1.0',
                ])
                ->post($webhook->url, $testPayload);

            $responseCode = $response->status();
            $responseBody = $response->body();
        } catch (\Exception $e) {
            $responseCode = 0;
            $responseBody = $e->getMessage();

            Log::warning('Webhook test delivery failed', [
                'webhook_id' => $webhook->id,
                'url' => $webhook->url,
                'error' => $e->getMessage(),
            ]);
        }

        // Log the test delivery
        WebhookLog::create([
            'webhook_id' => $webhook->id,
            'event' => 'test',
            'payload_json' => $testPayload,
            'response_code' => $responseCode,
            'response_body' => substr($responseBody, 0, 2000),
            'sent_at' => now(),
        ]);

        $webhook->update([
            'last_triggered_at' => now(),
            'last_response_code' => $responseCode,
        ]);

        $isSuccessful = $responseCode >= 200 && $responseCode < 300;

        if ($isSuccessful) {
            return redirect()->route('webhooks.index')
                ->with('success', 'Test webhook delivered successfully (HTTP ' . $responseCode . ').');
        }

        return redirect()->route('webhooks.index')
            ->with('error', 'Test webhook delivery failed (HTTP ' . $responseCode . ').');
    }

    /**
     * View delivery logs for a specific webhook.
     */
    public function logs(Request $request, $id): Response
    {
        $webhook = $request->user()->webhooks()->findOrFail($id);

        $logs = $webhook->logs()
            ->orderBy('sent_at', 'desc')
            ->paginate(50);

        return Inertia::render('Webhooks/Logs', [
            'webhook' => $webhook,
            'logs' => $logs,
        ]);
    }

    /**
     * Get the list of available webhook events.
     */
    private function availableEvents(): array
    {
        return [
            'message.received' => 'When a message is received',
            'message.sent' => 'When a message is sent',
            'message.delivered' => 'When a message is delivered',
            'message.read' => 'When a message is read',
            'message.failed' => 'When a message fails to send',
            'session.connected' => 'When a session connects',
            'session.disconnected' => 'When a session disconnects',
            'campaign.completed' => 'When a campaign completes',
            'campaign.failed' => 'When a campaign fails',
        ];
    }
}
