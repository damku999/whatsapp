<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebhookLog extends Model
{
    protected $table = 'webhook_logs';

    protected $fillable = [
        'webhook_id',
        'event',
        'payload_json',
        'response_code',
        'response_body',
        'sent_at',
    ];

    protected function casts(): array
    {
        return [
            'payload_json' => 'array',
            'sent_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function webhook(): BelongsTo
    {
        return $this->belongsTo(Webhook::class);
    }
}
