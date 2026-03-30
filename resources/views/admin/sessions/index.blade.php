@extends('admin.layouts.app')
@section('title', 'WhatsApp Session Monitor')

@section('content')
<div class="bg-white rounded-xl shadow-sm border border-gray-100">
    <div class="px-6 py-4 border-b">
        <h3 class="font-semibold text-gray-800">All WhatsApp Sessions</h3>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session Name</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                @forelse($sessions as $session)
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <p class="font-medium">{{ $session->user->name ?? 'N/A' }}</p>
                        <p class="text-sm text-gray-500">{{ $session->user->email ?? '' }}</p>
                    </td>
                    <td class="px-6 py-4 text-sm">{{ $session->session_name }}</td>
                    <td class="px-6 py-4 text-sm">{{ $session->phone_number ?? 'Not connected' }}</td>
                    <td class="px-6 py-4">
                        @php $colors = ['active' => 'bg-green-100 text-green-700', 'disconnected' => 'bg-red-100 text-red-700', 'pending' => 'bg-yellow-100 text-yellow-700', 'scanning' => 'bg-blue-100 text-blue-700', 'banned' => 'bg-gray-100 text-gray-700']; @endphp
                        <span class="px-2 py-1 text-xs rounded-full {{ $colors[$session->status] ?? 'bg-gray-100 text-gray-700' }}">{{ ucfirst($session->status) }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">{{ $session->last_active_at?->diffForHumans() ?? 'Never' }}</td>
                    <td class="px-6 py-4">
                        @if($session->status === 'active')
                        <form method="POST" action="{{ route('admin.sessions.disconnect', $session) }}" class="inline" onsubmit="return confirm('Disconnect this session?')">@csrf <button class="text-red-600 hover:text-red-700 text-sm">Disconnect</button></form>
                        @endif
                    </td>
                </tr>
                @empty
                <tr><td colspan="6" class="px-6 py-8 text-center text-gray-500">No sessions found.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="px-6 py-4 border-t">{{ $sessions->links() }}</div>
</div>
@endsection
