<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $table = 'settings';

    protected $fillable = [
        'key',
        'value',
        'group',
        'type',
        'description',
    ];

    // -------------------------------------------------------------------------
    // Static Accessors
    // -------------------------------------------------------------------------

    /**
     * Get a setting value by key, with an optional default.
     */
    public static function get(string $key, mixed $default = null): mixed
    {
        $setting = Cache::rememberForever("setting.{$key}", function () use ($key) {
            return static::where('key', $key)->first();
        });

        if (! $setting) {
            return $default;
        }

        return match ($setting->type) {
            'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
            'number' => is_numeric($setting->value) ? +$setting->value : $default,
            'json' => json_decode($setting->value, true) ?? $default,
            default => $setting->value,
        };
    }

    /**
     * Set a setting value by key. Creates the setting if it does not exist.
     */
    public static function set(string $key, mixed $value): void
    {
        $storedValue = is_array($value) ? json_encode($value) : (string) $value;

        static::updateOrCreate(
            ['key' => $key],
            ['value' => $storedValue],
        );

        Cache::forget("setting.{$key}");
    }
}
