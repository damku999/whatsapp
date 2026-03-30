<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SubscriptionPlan extends Model
{
    protected $table = 'subscription_plans';

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price_monthly',
        'price_yearly',
        'max_sessions',
        'max_messages_per_day',
        'max_contacts',
        'max_campaigns_per_month',
        'max_chatbot_flows',
        'max_team_members',
        'has_api_access',
        'has_webhooks',
        'has_group_messaging',
        'features_json',
        'is_active',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'price_monthly' => 'decimal:2',
            'price_yearly' => 'decimal:2',
            'features_json' => 'array',
            'is_active' => 'boolean',
            'has_api_access' => 'boolean',
            'has_webhooks' => 'boolean',
            'has_group_messaging' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'plan_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'plan_id');
    }
}
