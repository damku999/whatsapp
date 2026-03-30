<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ApiRateLimiter
{
    /**
     * Rate limits per endpoint type (requests per minute).
     */
    private const LIMITS = [
        'send' => 60,
        'send-bulk' => 10,
        'read' => 120,
        'default' => 60,
    ];

    /**
     * Handle an incoming request with rate limiting based on endpoint type.
     */
    public function handle(Request $request, Closure $next, string $endpoint = 'default'): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Unauthenticated.',
            ], 401);
        }

        $maxAttempts = self::LIMITS[$endpoint] ?? self::LIMITS['default'];
        $key = "api_rate:{$user->id}:{$endpoint}";

        if (RateLimiter::tooManyAttempts($key, $maxAttempts)) {
            $retryAfter = RateLimiter::availableIn($key);

            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Rate limit exceeded.',
                'retry_after' => $retryAfter,
            ], 429)->header('Retry-After', (string) $retryAfter);
        }

        RateLimiter::hit($key, 60);

        $response = $next($request);

        $response->headers->set('X-RateLimit-Limit', (string) $maxAttempts);
        $response->headers->set('X-RateLimit-Remaining', (string) RateLimiter::remaining($key, $maxAttempts));

        return $response;
    }
}
