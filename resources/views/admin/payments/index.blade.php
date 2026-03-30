@extends('admin.layouts.app')
@section('title', 'Payment Transactions')

@section('content')
<div class="bg-white rounded-xl shadow-sm border border-gray-100">
    <div class="px-6 py-4 border-b flex items-center justify-between">
        <h3 class="font-semibold text-gray-800">All Payments</h3>
        <form method="GET" class="flex gap-2">
            <select name="status" class="border rounded-lg px-3 py-2 text-sm" onchange="this.form.submit()">
                <option value="">All Status</option>
                <option value="pending" {{ request('status') === 'pending' ? 'selected' : '' }}>Pending</option>
                <option value="completed" {{ request('status') === 'completed' ? 'selected' : '' }}>Completed</option>
                <option value="failed" {{ request('status') === 'failed' ? 'selected' : '' }}>Failed</option>
            </select>
        </form>
    </div>
    <div class="overflow-x-auto">
        <table class="w-full">
            <thead class="bg-gray-50">
                <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y">
                @forelse($payments as $payment)
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4">
                        <p class="font-medium">{{ $payment->user->name ?? 'N/A' }}</p>
                        <p class="text-sm text-gray-500">{{ $payment->user->email ?? '' }}</p>
                    </td>
                    <td class="px-6 py-4 font-medium">&#8377;{{ number_format($payment->amount, 2) }}</td>
                    <td class="px-6 py-4 text-sm">{{ $payment->payment_method ?? 'N/A' }}@if($payment->utr_number) <br><span class="text-xs text-gray-400">UTR: {{ $payment->utr_number }}</span>@endif</td>
                    <td class="px-6 py-4 text-sm">{{ $payment->subscription?->plan?->name ?? 'N/A' }}</td>
                    <td class="px-6 py-4">
                        <span class="px-2 py-1 text-xs rounded-full {{ $payment->status === 'completed' ? 'bg-green-100 text-green-700' : ($payment->status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700') }}">{{ ucfirst($payment->status) }}</span>
                    </td>
                    <td class="px-6 py-4 text-sm text-gray-500">{{ $payment->created_at->format('M d, Y H:i') }}</td>
                    <td class="px-6 py-4">
                        @if($payment->status === 'pending')
                        <div class="flex gap-2">
                            <form method="POST" action="{{ route('admin.payments.approve', $payment) }}" class="inline">@csrf <button class="text-green-600 hover:text-green-700 text-sm font-medium">Approve</button></form>
                            <form method="POST" action="{{ route('admin.payments.reject', $payment) }}" class="inline">@csrf <button class="text-red-600 hover:text-red-700 text-sm">Reject</button></form>
                        </div>
                        @else
                        <span class="text-gray-400 text-sm">-</span>
                        @endif
                    </td>
                </tr>
                @empty
                <tr><td colspan="7" class="px-6 py-8 text-center text-gray-500">No payments found.</td></tr>
                @endforelse
            </tbody>
        </table>
    </div>
    <div class="px-6 py-4 border-t">{{ $payments->links() }}</div>
</div>
@endsection
