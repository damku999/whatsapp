<?php

namespace App\Http\Middleware;

use App\Models\ApiLog;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ValidateApiKey
{
    public function handle(Request $request, Closure $next): Response
    {
        $apiKey = $request->header('X-API-Key');

        if (!$apiKey) {
            return response()->json([
                'success' => false,
                'message' => 'API key is required. Send it via X-API-Key header.',
            ], 401);
        }

        $user = User::where('api_key', $apiKey)->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid API key.',
            ], 401);
        }

        if ($user->status !== 'active') {
            return response()->json([
                'success' => false,
                'message' => 'Account is not active.',
            ], 403);
        }

        $subscription = $user->activeSubscription;
        if (!$subscription || !$subscription->plan->has_api_access) {
            return response()->json([
                'success' => false,
                'message' => 'Your plan does not include API access.',
            ], 403);
        }

        $request->merge(['api_user' => $user]);
        auth()->login($user);

        $response = $next($request);

        ApiLog::create([
            'user_id' => $user->id,
            'endpoint' => $request->path(),
            'method' => $request->method(),
            'request_body' => json_encode($request->except(['api_user'])),
            'response_code' => $response->getStatusCode(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return $response;
    }
}
