<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'plan_id',
        'api_key',
        'api_secret',
        'phone',
        'company_name',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'api_secret',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'api_key' => 'string',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class);
    }

    public function activeSubscription(): HasOne
    {
        return $this->hasOne(Subscription::class)->where('status', 'active')->latest();
    }

    public function waSessions(): HasMany
    {
        return $this->hasMany(WaSession::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function contactGroups(): HasMany
    {
        return $this->hasMany(ContactGroup::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(MessageCampaign::class);
    }

    public function chatbotFlows(): HasMany
    {
        return $this->hasMany(ChatbotFlow::class);
    }

    public function messageTemplates(): HasMany
    {
        return $this->hasMany(MessageTemplate::class);
    }

    public function webhooks(): HasMany
    {
        return $this->hasMany(Webhook::class);
    }

    public function apiLogs(): HasMany
    {
        return $this->hasMany(ApiLog::class);
    }

    public function paymentTransactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    public function supportTickets(): HasMany
    {
        return $this->hasMany(SupportTicket::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function generateApiKey(): void
    {
        $this->api_key = Str::random(64);
        $this->save();
    }

    public function generateApiSecret(): void
    {
        $this->api_secret = encrypt(Str::random(32));
        $this->save();
    }

    public function hasFeature(string $feature): bool
    {
        $plan = $this->plan;

        if (! $plan) {
            return false;
        }

        $features = $plan->features_json ?? [];

        return in_array($feature, $features, true);
    }

    public function getRemainingMessages(): int
    {
        $plan = $this->plan;

        if (! $plan) {
            return 0;
        }

        $sentToday = $this->messages()
            ->where('direction', 'outgoing')
            ->whereDate('created_at', now()->toDateString())
            ->count();

        return max(0, $plan->max_messages_per_day - $sentToday);
    }

    public function canSendMessage(): bool
    {
        $activeSubscription = $this->activeSubscription;

        if (! $activeSubscription || ! $activeSubscription->isActive()) {
            return false;
        }

        return $this->getRemainingMessages() > 0;
    }
}
