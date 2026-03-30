<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use Illuminate\Http\Request;

class PaymentManagementController extends Controller
{
    public function index(Request $request)
    {
        $query = PaymentTransaction::with('user:id,name,email', 'subscription.plan');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $payments = $query->latest()->paginate(20);

        return view('admin.payments.index', compact('payments'));
    }

    public function approve(PaymentTransaction $payment)
    {
        $payment->update([
            'status' => 'completed',
            'verified_at' => now(),
            'verified_by' => auth()->id(),
        ]);

        // Activate the subscription
        if ($payment->subscription) {
            $payment->subscription->update(['status' => 'active']);
            $payment->user->update(['status' => 'active']);
        }

        return back()->with('success', 'Payment approved and subscription activated.');
    }

    public function reject(PaymentTransaction $payment)
    {
        $payment->update([
            'status' => 'failed',
            'verified_at' => now(),
            'verified_by' => auth()->id(),
        ]);

        return back()->with('success', 'Payment rejected.');
    }
}
