<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatbotFlow extends Model
{
    use BelongsToUser;

    protected $table = 'chatbot_flows';

    protected $fillable = [
        'user_id',
        'session_id',
        'name',
        'trigger_keyword',
        'trigger_type',
        'is_active',
        'priority',
        'office_hours_only',
        'office_hours_start',
        'office_hours_end',
        'fallback_message',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'office_hours_only' => 'boolean',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function session(): BelongsTo
    {
        return $this->belongsTo(WaSession::class, 'session_id');
    }

    public function nodes(): HasMany
    {
        return $this->hasMany(ChatbotNode::class, 'flow_id');
    }

    public function activeSessions(): HasMany
    {
        return $this->hasMany(ChatbotSession::class, 'flow_id');
    }
}
