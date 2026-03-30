<?php

namespace App\Models;

use App\Models\Traits\BelongsToUser;
use Illuminate\Database\Eloquent\Model;

class ApiLog extends Model
{
    use BelongsToUser;

    protected $table = 'api_logs';

    protected $fillable = [
        'user_id',
        'endpoint',
        'method',
        'request_body',
        'response_code',
        'response_body',
        'ip_address',
        'user_agent',
        'execution_time_ms',
    ];
}
