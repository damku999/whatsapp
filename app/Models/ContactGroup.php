<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class ContactGroup extends Model
{
    use BelongsToUser;

    protected $table = 'contact_groups';

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'contact_count',
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class, 'contact_group_members', 'group_id', 'contact_id')
            ->withTimestamps();
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    public function updateContactCount(): void
    {
        $this->contact_count = $this->contacts()->count();
        $this->save();
    }
}
