<?php

namespace Database\Seeders;

use App\Models\SubscriptionPlan;
use Illuminate\Database\Seeder;

class SubscriptionPlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Perfect for small businesses getting started with WhatsApp automation.',
                'price_monthly' => 499,
                'price_yearly' => 4990,
                'max_sessions' => 1,
                'max_messages_per_day' => 500,
                'max_contacts' => 1000,
                'max_campaigns_per_month' => 5,
                'max_chatbot_flows' => 1,
                'max_team_members' => 1,
                'has_api_access' => false,
                'has_webhooks' => false,
                'has_group_messaging' => false,
                'sort_order' => 1,
            ],
            [
                'name' => 'Professional',
                'slug' => 'professional',
                'description' => 'For growing businesses that need API access and more capacity.',
                'price_monthly' => 999,
                'price_yearly' => 9990,
                'max_sessions' => 3,
                'max_messages_per_day' => 2000,
                'max_contacts' => 10000,
                'max_campaigns_per_month' => null,
                'max_chatbot_flows' => 5,
                'max_team_members' => 3,
                'has_api_access' => true,
                'has_webhooks' => true,
                'has_group_messaging' => true,
                'sort_order' => 2,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'For established businesses with high-volume messaging needs.',
                'price_monthly' => 1999,
                'price_yearly' => 19990,
                'max_sessions' => 10,
                'max_messages_per_day' => 10000,
                'max_contacts' => 100000,
                'max_campaigns_per_month' => null,
                'max_chatbot_flows' => 999,
                'max_team_members' => 10,
                'has_api_access' => true,
                'has_webhooks' => true,
                'has_group_messaging' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'description' => 'Custom plan for large organizations. Contact us for pricing.',
                'price_monthly' => 4999,
                'price_yearly' => 49990,
                'max_sessions' => 999,
                'max_messages_per_day' => 999999,
                'max_contacts' => 999999,
                'max_campaigns_per_month' => null,
                'max_chatbot_flows' => 999,
                'max_team_members' => 999,
                'has_api_access' => true,
                'has_webhooks' => true,
                'has_group_messaging' => true,
                'sort_order' => 4,
            ],
        ];

        foreach ($plans as $plan) {
            SubscriptionPlan::updateOrCreate(
                ['slug' => $plan['slug']],
                $plan
            );
        }
    }
}
