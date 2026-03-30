<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Admin gets redirected to admin panel
        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        $stats = [
            'totalContacts' => $user->contacts()->count(),
            'activeSessions' => $user->waSessions()->where('status', 'active')->count(),
            'messagesToday' => $user->messages()
                ->where('direction', 'outgoing')
                ->whereDate('created_at', today())
                ->count(),
            'activeCampaigns' => $user->campaigns()
                ->whereIn('status', ['running', 'scheduled'])
                ->count(),
        ];

        $subscription = $user->activeSubscription?->load('plan');
        $recentMessages = $user->messages()
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'subscription' => $subscription,
            'recentMessages' => $recentMessages,
        ]);
    }
}
