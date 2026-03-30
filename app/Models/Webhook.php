<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Webhook extends Model
{
    use BelongsToUser;

    protected $table = 'webhooks';

    protected $fillable = [
        'user_id',
        'url',
        'events_json',
        'secret',
        'is_active',
        'last_triggered_at',
        'last_response_code',
        'failure_count',
    ];

    protected function casts(): array
    {
        return [
            'events_json' => 'array',
            'is_active' => 'boolean',
            'last_triggered_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function logs(): HasMany
    {
        return $this->hasMany(WebhookLog::class);
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Check if this webhook is subscribed to a given event.
     */
    public function supportsEvent(string $event): bool
    {
        $events = $this->events_json ?? [];

        return in_array($event, $events, true);
    }
}
