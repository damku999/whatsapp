<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class WaSession extends Model
{
    use BelongsToUser;

    protected $table = 'wa_sessions';

    protected $fillable = [
        'user_id',
        'session_name',
        'phone_number',
        'status',
        'qr_code',
        'pairing_code',
        'engine_session_id',
        'profile_name',
        'profile_picture_url',
        'last_active_at',
        'reconnect_attempts',
    ];

    protected function casts(): array
    {
        return [
            'last_active_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'session_id');
    }

    public function campaigns(): HasMany
    {
        return $this->hasMany(MessageCampaign::class, 'session_id');
    }

    public function chatbotFlows(): HasMany
    {
        return $this->hasMany(ChatbotFlow::class, 'session_id');
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isDisconnected(): bool
    {
        return $this->status === 'disconnected';
    }
}
