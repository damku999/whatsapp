<?php

namespace App\Console\Commands;

use App\Models\Notification;
use App\Models\Subscription;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class CheckSubscriptionExpiry extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'subscriptions:check-expiry';

    /**
     * The console command description.
     */
    protected $description = 'Check active subscriptions for expiry and send reminder notifications';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Checking subscription expiry...');

        $today = now()->startOfDay();

        // ---- 1. Expire subscriptions that are past their end date ----
        $expired = Subscription::where('status', 'active')
            ->whereDate('end_date', '<', $today)
            ->with('user')
            ->get();

        foreach ($expired as $subscription) {
            DB::transaction(function () use ($subscription) {
                $subscription->update(['status' => 'expired']);

                if ($subscription->user) {
                    $subscription->user->update(['status' => 'suspended']);

                    $this->createNotification(
                        $subscription->user->id,
                        'subscription_expired',
                        'Your subscription has expired. Please renew to continue using the platform.',
                    );
                }
            });

            $this->warn("Expired subscription #{$subscription->id} for user #{$subscription->user_id}");

            Log::info('Subscription expired', [
                'subscription_id' => $subscription->id,
                'user_id' => $subscription->user_id,
            ]);
        }

        // ---- 2. Send reminder for subscriptions expiring in 3 days ----
        $expiringIn3Days = Subscription::where('status', 'active')
            ->whereDate('end_date', $today->copy()->addDays(3))
            ->with('user')
            ->get();

        foreach ($expiringIn3Days as $subscription) {
            $this->createNotification(
                $subscription->user_id,
                'subscription_expiring_3_days',
                'Your subscription will expire in 3 days. Please renew to avoid service interruption.',
            );
            $this->line("3-day reminder sent for subscription #{$subscription->id}");
        }

        // ---- 3. Send reminder for subscriptions expiring in 1 day ----
        $expiringIn1Day = Subscription::where('status', 'active')
            ->whereDate('end_date', $today->copy()->addDay())
            ->with('user')
            ->get();

        foreach ($expiringIn1Day as $subscription) {
            $this->createNotification(
                $subscription->user_id,
                'subscription_expiring_1_day',
                'Your subscription will expire tomorrow. Renew now to keep your account active.',
            );
            $this->line("1-day urgent reminder sent for subscription #{$subscription->id}");
        }

        // ---- 4. Send reminder for subscriptions expiring today ----
        $expiringToday = Subscription::where('status', 'active')
            ->whereDate('end_date', $today)
            ->with('user')
            ->get();

        foreach ($expiringToday as $subscription) {
            $this->createNotification(
                $subscription->user_id,
                'subscription_expiring_today',
                'Your subscription expires today. Renew immediately to prevent service suspension.',
            );
            $this->line("Final reminder sent for subscription #{$subscription->id}");
        }

        $this->info(sprintf(
            'Done. Expired: %d | 3-day reminders: %d | 1-day reminders: %d | Today reminders: %d',
            $expired->count(),
            $expiringIn3Days->count(),
            $expiringIn1Day->count(),
            $expiringToday->count(),
        ));

        return self::SUCCESS;
    }

    /**
     * Create a notification record for a user.
     */
    private function createNotification(int $userId, string $type, string $message): void
    {
        Notification::create([
            'id' => Str::uuid()->toString(),
            'type' => $type,
            'notifiable_type' => 'App\\Models\\User',
            'notifiable_id' => $userId,
            'data' => ['message' => $message],
        ]);
    }
}
