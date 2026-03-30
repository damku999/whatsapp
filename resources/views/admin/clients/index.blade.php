@extends('admin.layouts.app')
@section('title', 'Client Management')

@section('content')
<div class="bg-white rounded-xl shadow-sm border border-gray-100">
    <div class="px-6 py-4 border-b flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">All Clients</h3>
        <form method="GET" class="flex gap-2">
            <input type="text" name="search" value="{{ request('search') }}" placeholder="Search clients..." class="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-wa-500">
            <select name="status" class="border rounded-lg px-3 py-2 text-sm" onchange="this.form.submit()">
                <option value="">All Status</option>
                <option value="active" {{ request('status') === 'active' ? 'selected' : '' }}>Active</option>
                <option value="pending" {{ request('status') === 'pending' ? 'selected' : '' }}>Pending</option>
                <option value="suspended" {{ request('status') === 'suspended' ? 'selected' : '' }}>Suspended</option>
            </select>
            <button type="submit" class="bg-wa-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-wa-700">Search</button>
        </form>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacts</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                @forelse($clients as $client)
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <div>
                            <p class="font-medium text-gray-800">{{ $client->name }}</p>
                            <p class="text-sm text-gray-500">{{ $client->email }}</p>
                            @if($client->company_name)<p class="text-xs text-gray-400">{{ $client->company_name }}</p>@endif
                        </div>
                    </td>
                    <td class="px-6 py-4 text-sm">{{ $client->activeSubscription?->plan?->name ?? 'None' }}</td>
                    <td class="px-6 py-4 text-sm">{{ $client->wa_sessions_count }}</td>
                    <td class="px-6 py-4 text-sm">{{ number_format($client->contacts_count) }}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full {{ $client->status === 'active' ? 'bg-green-100 text-green-700' : ($client->status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') }}">
                            {{ ucfirst($client->status) }}
                        </span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">{{ $client->created_at->format('M d, Y') }}</td>
                    <td class="px-6 py-4">
                        <div class="flex gap-2">
                            <a href="{{ route('admin.clients.show', $client) }}" class="text-wa-600 hover:text-wa-700 text-sm">View</a>
                            @if($client->status === 'active')
                            <form method="POST" action="{{ route('admin.clients.suspend', $client) }}" class="inline">@csrf <button class="text-red-600 hover:text-red-700 text-sm">Suspend</button></form>
                            @else
                            <form method="POST" action="{{ route('admin.clients.activate', $client) }}" class="inline">@csrf <button class="text-green-600 hover:text-green-700 text-sm">Activate</button></form>
                            @endif
                        </div>
                    </td>
                </tr>
                @empty
                <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No clients found.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="px-6 py-4 border-t">{{ $clients->links() }}</div>
</div>
@endsection
