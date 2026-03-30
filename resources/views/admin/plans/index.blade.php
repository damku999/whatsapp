@extends('admin.layouts.app')
@section('title', 'Subscription Plans')

@section('content')
<div class="mb-4 flex justify-end">
    <a href="{{ route('admin.plans.create') }}" class="bg-wa-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-wa-700">+ New Plan</a>
</div>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    @foreach($plans as $plan)
    <div class="bg-white rounded-xl shadow-sm border {{ $plan->is_active ? 'border-gray-100' : 'border-red-200 opacity-60' }} p-6">
        <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-lg text-gray-800">{{ $plan->name }}</h3>
            @unless($plan->is_active)<span class="text-xs text-red-600">Inactive</span>@endunless
        </div>
        <p class="text-3xl font-bold text-wa-700 mb-1">&#8377;{{ number_format($plan->price_monthly, 0) }}<span class="text-sm text-gray-500 font-normal">/mo</span></p>
        <p class="text-sm text-gray-500 mb-4">&#8377;{{ number_format($plan->price_yearly, 0) }}/year</p>
        <div class="space-y-2 text-sm border-t pt-4">
            <div class="flex justify-between"><span>Sessions</span><span class="font-medium">{{ $plan->max_sessions }}</span></div>
            <div class="flex justify-between"><span>Messages/Day</span><span class="font-medium">{{ number_format($plan->max_messages_per_day) }}</span></div>
            <div class="flex justify-between"><span>Contacts</span><span class="font-medium">{{ number_format($plan->max_contacts) }}</span></div>
            <div class="flex justify-between"><span>API</span><span class="font-medium">{{ $plan->has_api_access ? 'Yes' : 'No' }}</span></div>
            <div class="flex justify-between"><span>Webhooks</span><span class="font-medium">{{ $plan->has_webhooks ? 'Yes' : 'No' }}</span></div>
        </div>
        <div class="mt-4 pt-4 border-t flex gap-2">
            <a href="{{ route('admin.plans.edit', $plan) }}" class="text-wa-600 hover:text-wa-700 text-sm">Edit</a>
            <form method="POST" action="{{ route('admin.plans.destroy', $plan) }}" class="inline" onsubmit="return confirm('Delete this plan?')">@csrf @method('DELETE') <button class="text-red-600 hover:text-red-700 text-sm">Delete</button></form>
        </div>
    </div>
    @endforeach
</div>
@endsection
