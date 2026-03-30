<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    use BelongsToUser;

    protected $table = 'subscriptions';

    protected $fillable = [
        'user_id',
        'plan_id',
        'status',
        'start_date',
        'end_date',
        'payment_method',
        'amount_paid',
        'razorpay_subscription_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'amount_paid' => 'decimal:2',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function plan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class, 'plan_id');
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === 'active' && ! $this->isExpired();
    }

    public function isExpired(): bool
    {
        return $this->end_date->isPast();
    }

    public function daysRemaining(): int
    {
        if ($this->isExpired()) {
            return 0;
        }

        return (int) now()->diffInDays($this->end_date, false);
    }
}
