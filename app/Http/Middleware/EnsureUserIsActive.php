<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user() && $request->user()->status !== 'active' && $request->user()->role !== 'admin') {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Your account is not active. Please contact support.'], 403);
            }

            auth()->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            return redirect()->route('login')->with('error', 'Your account is not active. Please contact support.');
        }

        return $next($request);
    }
}
