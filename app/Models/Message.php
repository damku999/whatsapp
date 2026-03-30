<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Message extends Model
{
    use BelongsToUser;

    protected $table = 'messages';

    protected $fillable = [
        'user_id',
        'session_id',
        'to_number',
        'from_number',
        'direction',
        'message_type',
        'content',
        'media_path',
        'media_url',
        'wa_message_id',
        'status',
        'error_msg',
        'quoted_message_id',
        'sent_at',
        'delivered_at',
        'read_at',
        'campaign_id',
        'metadata_json',
    ];

    protected function casts(): array
    {
        return [
            'sent_at' => 'datetime',
            'delivered_at' => 'datetime',
            'read_at' => 'datetime',
            'metadata_json' => 'array',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function session(): BelongsTo
    {
        return $this->belongsTo(WaSession::class, 'session_id');
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(MessageCampaign::class, 'campaign_id');
    }
}
