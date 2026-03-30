<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MessageCampaign extends Model
{
    use BelongsToUser;

    protected $table = 'message_campaigns';

    protected $fillable = [
        'user_id',
        'session_id',
        'name',
        'type',
        'message_body',
        'media_path',
        'delay_min',
        'delay_max',
        'scheduled_at',
        'status',
        'total_count',
        'sent_count',
        'failed_count',
        'started_at',
        'completed_at',
        'is_recurring',
        'recurrence_pattern',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
            'is_recurring' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function session(): BelongsTo
    {
        return $this->belongsTo(WaSession::class, 'session_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(CampaignRecipient::class, 'campaign_id');
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Get the campaign progress as a percentage.
     */
    public function progress(): int
    {
        if ($this->total_count === 0) {
            return 0;
        }

        return (int) round(($this->sent_count + $this->failed_count) / $this->total_count * 100);
    }

    public function isPaused(): bool
    {
        return $this->status === 'paused';
    }

    public function isRunning(): bool
    {
        return $this->status === 'running';
    }
}
