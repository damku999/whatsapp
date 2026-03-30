<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class MessageTemplate extends Model
{
    use BelongsToUser;

    protected $table = 'message_templates';

    protected $fillable = [
        'user_id',
        'name',
        'body',
        'media_path',
        'message_type',
        'variables_json',
    ];

    protected function casts(): array
    {
        return [
            'variables_json' => 'array',
        ];
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Render the template body by replacing {{var}} placeholders with provided values.
     */
    public function render(array $variables): string
    {
        $body = $this->body;

        foreach ($variables as $key => $value) {
            $body = str_replace('{{' . $key . '}}', (string) $value, $body);
        }

        return $body;
    }
}
