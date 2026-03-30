<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // General
            ['key' => 'platform_name', 'value' => 'WhatsApp Monks', 'group' => 'general', 'type' => 'string', 'description' => 'Platform display name'],
            ['key' => 'platform_email', 'value' => 'support@whatsappmonks.com', 'group' => 'general', 'type' => 'string', 'description' => 'Platform support email'],
            ['key' => 'maintenance_mode', 'value' => '0', 'group' => 'general', 'type' => 'boolean', 'description' => 'Enable maintenance mode'],
            ['key' => 'trial_days', 'value' => '7', 'group' => 'general', 'type' => 'number', 'description' => 'Free trial period in days'],
            ['key' => 'default_plan', 'value' => 'starter', 'group' => 'general', 'type' => 'string', 'description' => 'Default plan for new signups'],

            // WhatsApp Engine
            ['key' => 'wa_engine_url', 'value' => 'http://127.0.0.1:3001', 'group' => 'engine', 'type' => 'string', 'description' => 'WhatsApp Engine internal URL'],
            ['key' => 'max_reconnect_attempts', 'value' => '3', 'group' => 'engine', 'type' => 'number', 'description' => 'Max auto-reconnect attempts per session'],
            ['key' => 'session_health_check_interval', 'value' => '5', 'group' => 'engine', 'type' => 'number', 'description' => 'Health check interval in minutes'],

            // Messaging
            ['key' => 'default_delay_min', 'value' => '3', 'group' => 'messaging', 'type' => 'number', 'description' => 'Default minimum delay between bulk messages (seconds)'],
            ['key' => 'default_delay_max', 'value' => '8', 'group' => 'messaging', 'type' => 'number', 'description' => 'Default maximum delay between bulk messages (seconds)'],
            ['key' => 'max_media_size_mb', 'value' => '16', 'group' => 'messaging', 'type' => 'number', 'description' => 'Maximum media file size in MB'],

            // Billing
            ['key' => 'razorpay_enabled', 'value' => '1', 'group' => 'billing', 'type' => 'boolean', 'description' => 'Enable Razorpay payments'],
            ['key' => 'upi_manual_enabled', 'value' => '1', 'group' => 'billing', 'type' => 'boolean', 'description' => 'Enable manual UPI payments'],
            ['key' => 'upi_id', 'value' => '', 'group' => 'billing', 'type' => 'string', 'description' => 'Your UPI ID for manual payments'],
            ['key' => 'currency', 'value' => 'INR', 'group' => 'billing', 'type' => 'string', 'description' => 'Default currency'],

            // Notifications
            ['key' => 'expiry_reminder_days', 'value' => '3,1,0', 'group' => 'notifications', 'type' => 'string', 'description' => 'Days before expiry to send reminders (comma-separated)'],
            ['key' => 'send_welcome_email', 'value' => '1', 'group' => 'notifications', 'type' => 'boolean', 'description' => 'Send welcome email on registration'],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                $setting
            );
        }
    }
}
