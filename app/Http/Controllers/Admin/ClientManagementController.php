<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;

class ClientManagementController extends Controller
{
    public function index(Request $request)
    {
        $query = User::where('role', 'client');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $clients = $query->withCount(['waSessions', 'contacts', 'messages'])
            ->with('activeSubscription.plan')
            ->latest()
            ->paginate(20);

        return view('admin.clients.index', compact('clients'));
    }

    public function show(User $client)
    {
        $client->load([
            'activeSubscription.plan',
            'waSessions',
            'paymentTransactions' => fn($q) => $q->latest()->take(10),
        ]);

        $stats = [
            'totalMessages' => $client->messages()->count(),
            'totalContacts' => $client->contacts()->count(),
            'totalCampaigns' => $client->campaigns()->count(),
        ];

        return view('admin.clients.show', compact('client', 'stats'));
    }

    public function suspend(User $client)
    {
        $client->update(['status' => 'suspended']);
        return back()->with('success', 'Client suspended successfully.');
    }

    public function activate(User $client)
    {
        $client->update(['status' => 'active']);
        return back()->with('success', 'Client activated successfully.');
    }

    public function destroy(User $client)
    {
        $client->delete();
        return redirect()->route('admin.clients.index')->with('success', 'Client deleted.');
    }
}
