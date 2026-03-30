<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatbotNode extends Model
{
    protected $table = 'chatbot_nodes';

    protected $fillable = [
        'flow_id',
        'node_type',
        'content',
        'media_path',
        'options_json',
        'next_node_id',
        'position_x',
        'position_y',
        'variable_name',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'options_json' => 'array',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function flow(): BelongsTo
    {
        return $this->belongsTo(ChatbotFlow::class, 'flow_id');
    }

    public function nextNode(): BelongsTo
    {
        return $this->belongsTo(ChatbotNode::class, 'next_node_id');
    }
}
