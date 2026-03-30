<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $table = 'coupons';

    protected $fillable = [
        'code',
        'description',
        'discount_type',
        'discount_value',
        'max_uses',
        'used_count',
        'valid_from',
        'valid_until',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'discount_value' => 'decimal:2',
            'valid_from' => 'date',
            'valid_until' => 'date',
            'is_active' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Check if the coupon is currently valid for use.
     */
    public function isValid(): bool
    {
        if (! $this->is_active) {
            return false;
        }

        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) {
            return false;
        }

        $today = now()->startOfDay();

        if ($this->valid_from && $today->lt($this->valid_from)) {
            return false;
        }

        if ($this->valid_until && $today->gt($this->valid_until)) {
            return false;
        }

        return true;
    }

    /**
     * Calculate the discount for a given amount.
     */
    public function calculateDiscount(float $amount): float
    {
        if (! $this->isValid()) {
            return 0.0;
        }

        if ($this->discount_type === 'percentage') {
            return round($amount * ($this->discount_value / 100), 2);
        }

        // Flat discount: cannot exceed the amount itself.
        return round(min((float) $this->discount_value, $amount), 2);
    }
}
