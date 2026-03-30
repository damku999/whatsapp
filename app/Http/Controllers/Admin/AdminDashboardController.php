<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\WaSession;
use App\Models\Message;
use App\Models\Subscription;
use App\Models\PaymentTransaction;
use Illuminate\Http\Request;

class AdminDashboardController extends Controller
{
    public function index()
    {
        $stats = [
            'totalClients' => User::where('role', 'client')->count(),
            'activeClients' => User::where('role', 'client')->where('status', 'active')->count(),
            'totalSessions' => WaSession::count(),
            'activeSessions' => WaSession::where('status', 'active')->count(),
            'messagesToday' => Message::whereDate('created_at', today())->count(),
            'activeSubscriptions' => Subscription::where('status', 'active')->count(),
            'pendingPayments' => PaymentTransaction::where('status', 'pending')->count(),
            'revenueThisMonth' => PaymentTransaction::where('status', 'completed')
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->sum('amount'),
        ];

        $recentClients = User::where('role', 'client')
            ->latest()
            ->take(5)
            ->get(['id', 'name', 'email', 'status', 'created_at']);

        $recentPayments = PaymentTransaction::with('user:id,name,email')
            ->latest()
            ->take(5)
            ->get();

        return view('admin.dashboard.index', compact('stats', 'recentClients', 'recentPayments'));
    }
}
