@extends('admin.layouts.app')

@section('title', 'Admin Dashboard')

@section('content')
{{-- Stats Cards --}}
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Total Clients</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ number_format($stats['totalClients']) }}</p>
                <p class="text-xs text-green-600 mt-1">{{ $stats['activeClients'] }} active</p>
            </div>
            <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">WA Sessions</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ number_format($stats['activeSessions']) }}</p>
                <p class="text-xs text-gray-500 mt-1">of {{ $stats['totalSessions'] }} total</p>
            </div>
            <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Messages Today</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">{{ number_format($stats['messagesToday']) }}</p>
            </div>
            <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            </div>
        </div>
    </div>

    <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div class="flex items-center justify-between">
            <div>
                <p class="text-sm text-gray-500">Revenue (This Month)</p>
                <p class="text-3xl font-bold text-gray-800 mt-1">&#8377;{{ number_format($stats['revenueThisMonth'], 0) }}</p>
                <p class="text-xs text-orange-600 mt-1">{{ $stats['pendingPayments'] }} pending</p>
            </div>
            <div class="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
        </div>
    </div>
</div>

<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    {{-- Recent Clients --}}
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">Recent Clients</h3>
            <a href="{{ route('admin.clients.index') }}" class="text-sm text-wa-600 hover:text-wa-700">View All</a>
        </div>
        <div class="divide-y">
            @forelse($recentClients as $client)
            <div class="px-6 py-3 flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-800">{{ $client->name }}</p>
                    <p class="text-sm text-gray-500">{{ $client->email }}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full {{ $client->status === 'active' ? 'bg-green-100 text-green-700' : ($client->status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') }}">
                    {{ ucfirst($client->status) }}
                </span>
            </div>
            @empty
            <div class="px-6 py-8 text-center text-gray-500">No clients yet.</div>
            @endforelse
        </div>
    </div>

    {{-- Recent Payments --}}
    <div class="bg-white rounded-xl shadow-sm border border-gray-100">
        <div class="px-6 py-4 border-b flex items-center justify-between">
            <h3 class="font-semibold text-gray-800">Recent Payments</h3>
            <a href="{{ route('admin.payments.index') }}" class="text-sm text-wa-600 hover:text-wa-700">View All</a>
        </div>
        <div class="divide-y">
            @forelse($recentPayments as $payment)
            <div class="px-6 py-3 flex items-center justify-between">
                <div>
                    <p class="font-medium text-gray-800">{{ $payment->user->name ?? 'N/A' }}</p>
                    <p class="text-sm text-gray-500">&#8377;{{ number_format($payment->amount, 2) }} &middot; {{ $payment->payment_method ?? 'N/A' }}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full {{ $payment->status === 'completed' ? 'bg-green-100 text-green-700' : ($payment->status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') }}">
                    {{ ucfirst($payment->status) }}
                </span>
            </div>
            @empty
            <div class="px-6 py-8 text-center text-gray-500">No payments yet.</div>
            @endforelse
        </div>
    </div>
</div>
@endsection
