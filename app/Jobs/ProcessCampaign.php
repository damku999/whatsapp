<?php

namespace App\Jobs;

use App\Models\CampaignRecipient;
use App\Models\MessageCampaign;
use App\Services\WhatsAppEngineService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessCampaign implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     */
    public int $tries = 1;

    /**
     * The maximum number of seconds the job can run.
     */
    public int $timeout = 7200; // 2 hours

    public function __construct(
        private MessageCampaign $campaign,
    ) {}

    public function handle(WhatsAppEngineService $engine): void
    {
        $campaign = $this->campaign->fresh();

        if (!$campaign || !in_array($campaign->status, ['running', 'scheduled'], true)) {
            Log::info("Campaign {$campaign?->id} is not in a runnable state ({$campaign?->status}). Skipping.");
            return;
        }

        // If scheduled, mark as running now
        if ($campaign->status === 'scheduled') {
            $campaign->update([
                'status' => 'running',
                'started_at' => now(),
            ]);
        }

        $session = $campaign->session;

        if (!$session || !$session->isActive()) {
            $campaign->update([
                'status' => 'failed',
                'completed_at' => now(),
            ]);
            Log::error("Campaign {$campaign->id}: Session is not active or does not exist.");
            return;
        }

        $user = $campaign->user;

        $delayMin = max(1, $campaign->delay_min ?? 5);
        $delayMax = max($delayMin, $campaign->delay_max ?? 15);

        $pendingRecipients = $campaign->recipients()
            ->where('status', 'pending')
            ->get();

        foreach ($pendingRecipients as $recipient) {
            // Re-check campaign status in case it was paused or cancelled
            $campaign->refresh();

            if ($campaign->status === 'paused') {
                Log::info("Campaign {$campaign->id} was paused. Stopping processing.");
                return;
            }

            if ($campaign->status === 'cancelled') {
                Log::info("Campaign {$campaign->id} was cancelled. Stopping processing.");
                return;
            }

            // Check daily message limit before each send
            if (!$user->canSendMessage()) {
                Log::warning("Campaign {$campaign->id}: User {$user->id} has reached daily message limit. Pausing campaign.");
                $campaign->update(['status' => 'paused']);
                return;
            }

            $mediaUrl = $campaign->media_path
                ? asset('storage/' . $campaign->media_path)
                : null;

            $result = $engine->sendMessage(
                sessionId: $session->engine_session_id,
                to: $recipient->phone,
                type: $campaign->type ?? 'text',
                content: $campaign->message_body,
                mediaUrl: $mediaUrl,
            );

            if (!empty($result['error'])) {
                Log::error("Campaign {$campaign->id}: Failed to send to {$recipient->phone}: {$result['error']}");

                $recipient->update([
                    'status' => 'failed',
                    'error_msg' => substr($result['error'], 0, 500),
                ]);

                $campaign->increment('failed_count');
            } else {
                // Persist the Message record
                \App\Models\Message::create([
                    'user_id' => $user->id,
                    'session_id' => $session->id,
                    'to_number' => $recipient->phone,
                    'from_number' => $session->phone_number,
                    'direction' => 'outgoing',
                    'message_type' => $campaign->type ?? 'text',
                    'content' => $campaign->message_body,
                    'media_path' => $campaign->media_path,
                    'wa_message_id' => $result['messageId'] ?? $result['message_id'] ?? null,
                    'status' => 'sent',
                    'sent_at' => now(),
                    'campaign_id' => $campaign->id,
                ]);

                $recipient->update([
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);

                $campaign->increment('sent_count');
            }

            // Random delay between sends to avoid rate limiting
            $sleepSeconds = random_int($delayMin, $delayMax);
            sleep($sleepSeconds);
        }

        // Check if all recipients have been processed
        $remainingPending = $campaign->recipients()->where('status', 'pending')->count();

        if ($remainingPending === 0) {
            $campaign->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);
            Log::info("Campaign {$campaign->id} completed. Sent: {$campaign->sent_count}, Failed: {$campaign->failed_count}");
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error("ProcessCampaign job failed for campaign {$this->campaign->id}: {$exception->getMessage()}");

        $this->campaign->update([
            'status' => 'failed',
            'completed_at' => now(),
        ]);
    }
}
