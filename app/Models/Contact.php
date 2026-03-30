<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Contact extends Model
{
    use BelongsToUser;

    protected $table = 'contacts';

    protected $fillable = [
        'user_id',
        'name',
        'phone',
        'email',
        'tags',
        'custom_fields_json',
        'opted_out',
        'opted_out_at',
    ];

    protected function casts(): array
    {
        return [
            'tags' => 'array',
            'custom_fields_json' => 'array',
            'opted_out' => 'boolean',
            'opted_out_at' => 'datetime',
        ];
    }

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(ContactGroup::class, 'contact_group_members', 'contact_id', 'group_id')
            ->withTimestamps();
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class, 'to_number', 'phone');
    }
}
