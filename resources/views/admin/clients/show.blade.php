@extends('admin.layouts.app')
@section('title', 'Client: ' . $client->name)

@section('content')
<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <div class="lg:col-span-2 space-y-6">
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 class="font-semibold text-gray-800 mb-4">Client Details</h3>
            <dl class="grid grid-cols-2 gap-4">
                <div><dt class="text-sm text-gray-500">Name</dt><dd class="font-medium">{{ $client->name }}</dd></div>
                <div><dt class="text-sm text-gray-500">Email</dt><dd class="font-medium">{{ $client->email }}</dd></div>
                <div><dt class="text-sm text-gray-500">Phone</dt><dd class="font-medium">{{ $client->phone ?? 'N/A' }}</dd></div>
                <div><dt class="text-sm text-gray-500">Company</dt><dd class="font-medium">{{ $client->company_name ?? 'N/A' }}</dd></div>
                <div><dt class="text-sm text-gray-500">Status</dt><dd><span class="px-2 py-1 text-xs rounded-full {{ $client->status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }}">{{ ucfirst($client->status) }}</span></dd></div>
                <div><dt class="text-sm text-gray-500">Joined</dt><dd class="font-medium">{{ $client->created_at->format('M d, Y') }}</dd></div>
            </dl>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 class="font-semibold text-gray-800 mb-4">WhatsApp Sessions</h3>
            @forelse($client->waSessions as $session)
            <div class="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                    <p class="font-medium">{{ $session->session_name }}</p>
                    <p class="text-sm text-gray-500">{{ $session->phone_number ?? 'Not connected' }}</p>
                </div>
                <span class="px-2 py-1 text-xs rounded-full {{ $session->status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700' }}">{{ ucfirst($session->status) }}</span>
            </div>
            @empty
            <p class="text-gray-500 text-sm">No sessions.</p>
            @endforelse
        </div>
    </div>

    <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 class="font-semibold text-gray-800 mb-4">Stats</h3>
            <div class="space-y-3">
                <div class="flex justify-between"><span class="text-gray-500">Messages</span><span class="font-medium">{{ number_format($stats['totalMessages']) }}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Contacts</span><span class="font-medium">{{ number_format($stats['totalContacts']) }}</span></div>
                <div class="flex justify-between"><span class="text-gray-500">Campaigns</span><span class="font-medium">{{ number_format($stats['totalCampaigns']) }}</span></div>
            </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 class="font-semibold text-gray-800 mb-4">Subscription</h3>
            @if($client->activeSubscription)
            <div class="space-y-2">
                <p><span class="text-gray-500">Plan:</span> <span class="font-medium">{{ $client->activeSubscription->plan->name }}</span></p>
                <p><span class="text-gray-500">Expires:</span> <span class="font-medium">{{ $client->activeSubscription->end_date->format('M d, Y') }}</span></p>
                <p><span class="text-gray-500">Status:</span> <span class="font-medium">{{ ucfirst($client->activeSubscription->status) }}</span></p>
            </div>
            @else
            <p class="text-gray-500 text-sm">No active subscription.</p>
            @endif
        </div>
    </div>
</div>
@endsection
