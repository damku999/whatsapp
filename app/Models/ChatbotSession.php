<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotSession extends Model
{
    use BelongsToUser;

    protected $table = 'chatbot_sessions';

    protected $fillable = [
        'user_id',
        'contact_phone',
        'flow_id',
        'current_node_id',
        'variables_json',
        'is_active',
        'is_escalated',
        'started_at',
    ];

    protected function casts(): array
    {
        return [
            'variables_json' => 'array',
            'is_active' => 'boolean',
            'is_escalated' => 'boolean',
            'started_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ChatbotFlow::class, 'flow_id');
    }

    public function currentNode(): BelongsTo
    {
        return $this->belongsTo(ChatbotNode::class, 'current_node_id');
    }
}
