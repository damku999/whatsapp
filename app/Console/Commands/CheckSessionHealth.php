<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\WaSession;
use App\Services\WhatsAppEngineService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CheckSessionHealth extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sessions:health-check';

    /**
     * The console command description.
     */
    protected $description = 'Check health of all active WhatsApp sessions and sync status from the engine';

    /**
     * Execute the console command.
     */
    public function handle(WhatsAppEngineService $engine): int
    {
        $this->info('Running session health check...');

        $sessions = WaSession::whereIn('status', ['active', 'scanning'])
            ->with('user')
            ->get();

        if ($sessions->isEmpty()) {
            $this->info('No active sessions to check.');

            return self::SUCCESS;
        }

        $disconnectedCount = 0;
        $checkedCount = 0;

        foreach ($sessions as $session) {
            if (! $session->engine_session_id) {
                continue;
            }

            $checkedCount++;

            $engineStatus = $engine->getSessionStatus($session->engine_session_id);

            // If the engine itself returned an error, log and skip
            if (isset($engineStatus['success']) && $engineStatus['success'] === false) {
                Log::warning('Session health check: engine error', [
                    'session_id' => $session->id,
                    'engine_session_id' => $session->engine_session_id,
                    'error' => $engineStatus['error'] ?? 'unknown',
                ]);
                continue;
            }

            $newStatus = $this->mapEngineStatus($engineStatus['status'] ?? '');

            if ($newStatus === null) {
                continue;
            }

            // Only update if status changed
            if ($session->status !== $newStatus) {
                $oldStatus = $session->status;

                $updateData = ['status' => $newStatus];

                // If the session is now active, record the last active time
                if ($newStatus === 'active') {
                    $updateData['last_active_at'] = now();
                }

                $session->update($updateData);

                Log::info('Session status changed', [
                    'session_id' => $session->id,
                    'user_id' => $session->user_id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ]);

                // If the session disconnected, notify the user
                if ($newStatus === 'disconnected') {
                    $disconnectedCount++;

                    Notification::create([
                        'id' => Str::uuid()->toString(),
                        'type' => 'session_disconnected',
                        'notifiable_type' => 'App\\Models\\User',
                        'notifiable_id' => $session->user_id,
                        'data' => [
                            'message' => "WhatsApp session \"{$session->session_name}\" has been disconnected. Please reconnect.",
                            'session_id' => $session->id,
                        ],
                    ]);

                    $this->warn("Session #{$session->id} ({$session->session_name}) disconnected for user #{$session->user_id}");
                }
            }
        }

        $this->info(sprintf(
            'Done. Checked: %d | Disconnected: %d',
            $checkedCount,
            $disconnectedCount,
        ));

        return self::SUCCESS;
    }

    /**
     * Map engine status strings to local status values.
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
