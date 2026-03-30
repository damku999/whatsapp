<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Coupon;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Models\SubscriptionPlan;
use App\Services\InvoiceService;
use App\Services\RazorpayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class BillingController extends Controller
{
    public function __construct(
        private RazorpayService $razorpay,
        private InvoiceService $invoiceService,
    ) {}

    // -------------------------------------------------------------------------
    // GET /billing
    // -------------------------------------------------------------------------

    public function index(Request $request)
    {
        $user = $request->user();

        // Active subscription with plan details
        $currentPlan = $user->activeSubscription?->load('plan');

        // Usage stats
        $plan = $currentPlan?->plan ?? $user->plan;
        $messagesToday = $user->messages()
            ->where('direction', 'outgoing')
            ->whereDate('created_at', today())
            ->count();

        $usage = [
            'messages_today' => $messagesToday,
            'messages_limit' => $plan?->max_messages_per_day ?? 0,
            'contacts_count' => $user->contacts()->count(),
            'contacts_limit' => $plan?->max_contacts ?? 0,
            'sessions_count' => $user->waSessions()->count(),
            'sessions_limit' => $plan?->max_sessions ?? 0,
        ];

        // Available plans for upgrade
        $plans = SubscriptionPlan::where('is_active', true)
            ->orderBy('sort_order')
            ->get();

        // Recent transactions
        $transactions = $user->paymentTransactions()
            ->with('subscription.plan')
            ->latest()
            ->paginate(10);

        // Pending UPI payment awaiting admin approval
        $pendingPayment = $user->paymentTransactions()
            ->where('status', 'pending')
            ->where('payment_method', 'upi_manual')
            ->latest()
            ->first();

        return Inertia::render('Billing/Index', [
            'currentPlan' => $currentPlan,
            'usage' => $usage,
            'plans' => $plans,
            'transactions' => $transactions,
            'pendingPayment' => $pendingPayment,
            'razorpayKey' => $this->razorpay->isConfigured() ? $this->razorpay->getKeyId() : null,
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /billing/subscribe
    // -------------------------------------------------------------------------

    public function subscribe(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'exists:subscription_plans,id'],
            'payment_method' => ['required', 'in:razorpay,upi_manual'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
            'coupon_code' => ['nullable', 'string', 'max:50'],
        ]);

        $user = $request->user();
        $plan = SubscriptionPlan::findOrFail($validated['plan_id']);

        // Determine the base price
        $amount = $validated['billing_cycle'] === 'yearly'
            ? (float) $plan->price_yearly
            : (float) $plan->price_monthly;

        // Apply coupon discount if provided
        $discount = 0;
        if (! empty($validated['coupon_code'])) {
            $coupon = Coupon::where('code', $validated['coupon_code'])->first();
            if ($coupon && $coupon->isValid()) {
                $discount = $coupon->calculateDiscount($amount);
            }
        }

        $finalAmount = max(0, $amount - $discount);

        // ---- Razorpay flow ----
        if ($validated['payment_method'] === 'razorpay') {
            if (! $this->razorpay->isConfigured()) {
                return back()->withErrors(['payment_method' => 'Online payment is currently unavailable. Please use UPI manual transfer.']);
            }

            $orderResult = $this->razorpay->createOrder($finalAmount, 'INR', [
                'user_id' => (string) $user->id,
                'plan_id' => (string) $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
            ]);

            if (! ($orderResult['success'] ?? false)) {
                return back()->withErrors(['payment_method' => 'Failed to create payment order. Please try again.']);
            }

            // Create a pending subscription and transaction record
            $subscription = DB::transaction(function () use ($user, $plan, $validated, $finalAmount, $orderResult) {
                $subscription = Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'status' => 'pending',
                    'payment_method' => 'razorpay',
                    'amount_paid' => $finalAmount,
                    'start_date' => now(),
                    'end_date' => $validated['billing_cycle'] === 'yearly'
                        ? now()->addYear()
                        : now()->addMonth(),
                ]);

                PaymentTransaction::create([
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'razorpay_order_id' => $orderResult['order_id'],
                    'amount' => $finalAmount,
                    'currency' => 'INR',
                    'status' => 'pending',
                    'payment_method' => 'razorpay',
                    'notes' => json_encode([
                        'plan_name' => $plan->name,
                        'billing_cycle' => $validated['billing_cycle'],
                    ]),
                ]);

                return $subscription;
            });

            return back()->with('razorpay_order', [
                'order_id' => $orderResult['order_id'],
                'amount' => (int) round($finalAmount * 100),
                'currency' => 'INR',
                'subscription_id' => $subscription->id,
                'key' => $this->razorpay->getKeyId(),
                'name' => config('app.name', 'WhatsApp Monks'),
                'description' => $plan->name . ' - ' . ucfirst($validated['billing_cycle']),
                'prefill' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'contact' => $user->phone ?? '',
                ],
            ]);
        }

        // ---- UPI Manual flow ----
        // We create subscription in pending state; payment will be submitted separately.
        $subscription = Subscription::create([
            'user_id' => $user->id,
            'plan_id' => $plan->id,
            'status' => 'pending',
            'payment_method' => 'upi_manual',
            'amount_paid' => $finalAmount,
            'start_date' => now(),
            'end_date' => $validated['billing_cycle'] === 'yearly'
                ? now()->addYear()
                : now()->addMonth(),
        ]);

        return back()->with('success', 'Subscription created. Please submit your UPI payment details.')
            ->with('pending_subscription_id', $subscription->id);
    }

    // -------------------------------------------------------------------------
    // POST /billing/razorpay/verify
    // -------------------------------------------------------------------------

    public function verifyRazorpay(Request $request)
    {
        $validated = $request->validate([
            'razorpay_payment_id' => ['required', 'string'],
            'razorpay_order_id' => ['required', 'string'],
            'razorpay_signature' => ['required', 'string'],
        ]);

        $user = $request->user();

        // Verify signature
        $isValid = $this->razorpay->verifyPaymentSignature(
            $validated['razorpay_order_id'],
            $validated['razorpay_payment_id'],
            $validated['razorpay_signature'],
        );

        if (! $isValid) {
            Log::warning('Razorpay signature verification failed', [
                'user_id' => $user->id,
                'order_id' => $validated['razorpay_order_id'],
            ]);

            return back()->withErrors(['payment' => 'Payment verification failed. Please contact support.']);
        }

        // Find the pending transaction by order ID
        $transaction = PaymentTransaction::where('razorpay_order_id', $validated['razorpay_order_id'])
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if (! $transaction) {
            return back()->withErrors(['payment' => 'Payment transaction not found.']);
        }

        // Activate atomically
        DB::transaction(function () use ($transaction, $validated, $user) {
            $transaction->update([
                'razorpay_payment_id' => $validated['razorpay_payment_id'],
                'status' => 'completed',
                'verified_at' => now(),
            ]);

            if ($transaction->subscription) {
                $transaction->subscription->update(['status' => 'active']);

                // Update user plan reference and status
                $user->update([
                    'plan_id' => $transaction->subscription->plan_id,
                    'status' => 'active',
                ]);
            }

            // Increment coupon usage if one was applied
            $notes = json_decode($transaction->notes ?? '{}', true);
            if (! empty($notes['coupon_code'])) {
                Coupon::where('code', $notes['coupon_code'])->increment('used_count');
            }
        });

        return back()->with('success', 'Payment verified successfully. Your subscription is now active.');
    }

    // -------------------------------------------------------------------------
    // POST /billing/upi-payment
    // -------------------------------------------------------------------------

    public function submitUpiPayment(Request $request)
    {
        $validated = $request->validate([
            'subscription_id' => ['required_without:plan_id', 'nullable', 'exists:subscriptions,id'],
            'plan_id' => ['required_without:subscription_id', 'nullable', 'exists:subscription_plans,id'],
            'utr_number' => ['required', 'string', 'max:100'],
            'screenshot' => ['required', 'file', 'image', 'max:5120'], // max 5MB
        ]);

        $user = $request->user();

        // Determine the subscription to attach the payment to
        $subscription = null;

        if (! empty($validated['subscription_id'])) {
            $subscription = Subscription::where('id', $validated['subscription_id'])
                ->where('user_id', $user->id)
                ->first();
        }

        if (! $subscription && ! empty($validated['plan_id'])) {
            // Create a new pending subscription for this plan
            $plan = SubscriptionPlan::findOrFail($validated['plan_id']);
            $subscription = Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $plan->id,
                'status' => 'pending',
                'payment_method' => 'upi_manual',
                'amount_paid' => (float) $plan->price_monthly,
                'start_date' => now(),
                'end_date' => now()->addMonth(),
            ]);
        }

        if (! $subscription) {
            return back()->withErrors(['subscription_id' => 'Could not determine the subscription for this payment.']);
        }

        // Store screenshot
        $screenshotPath = $request->file('screenshot')->store('payment-screenshots', 'public');

        PaymentTransaction::create([
            'user_id' => $user->id,
            'subscription_id' => $subscription->id,
            'amount' => $subscription->amount_paid,
            'currency' => 'INR',
            'status' => 'pending',
            'payment_method' => 'upi_manual',
            'utr_number' => $validated['utr_number'],
            'screenshot_path' => $screenshotPath,
            'notes' => json_encode([
                'plan_name' => $subscription->plan?->name ?? 'N/A',
            ]),
        ]);

        return back()->with('success', 'Payment submitted for review. You will be notified once approved.');
    }

    // -------------------------------------------------------------------------
    // POST /billing/apply-coupon
    // -------------------------------------------------------------------------

    public function applyCoupon(Request $request)
    {
        $validated = $request->validate([
            'coupon_code' => ['required', 'string', 'max:50'],
            'amount' => ['required', 'numeric', 'min:0'],
        ]);

        $coupon = Coupon::where('code', $validated['coupon_code'])->first();

        if (! $coupon) {
            return response()->json(['valid' => false, 'message' => 'Coupon not found.'], 422);
        }

        if (! $coupon->isValid()) {
            return response()->json(['valid' => false, 'message' => 'Coupon is expired or has reached its usage limit.'], 422);
        }

        $discount = $coupon->calculateDiscount((float) $validated['amount']);

        return response()->json([
            'valid' => true,
            'discount' => $discount,
            'discount_type' => $coupon->discount_type,
            'discount_value' => $coupon->discount_value,
            'final_amount' => max(0, (float) $validated['amount'] - $discount),
        ]);
    }

    // -------------------------------------------------------------------------
    // GET /billing/invoice/{transaction}
    // -------------------------------------------------------------------------

    public function downloadInvoice(PaymentTransaction $transaction)
    {
        $user = request()->user();

        // Ensure the transaction belongs to the authenticated user
        if ((int) $transaction->user_id !== (int) $user->id) {
            abort(403);
        }

        $html = $this->invoiceService->generate($transaction);
        $filename = 'invoice-' . str_pad((string) $transaction->id, 6, '0', STR_PAD_LEFT) . '.html';

        return response($html, 200, [
            'Content-Type' => 'text/html',
            'Content-Disposition' => 'inline; filename="' . $filename . '"',
        ]);
    }

    // -------------------------------------------------------------------------
    // POST /billing/upgrade
    // -------------------------------------------------------------------------

    public function upgrade(Request $request)
    {
        $validated = $request->validate([
            'plan_id' => ['required', 'exists:subscription_plans,id'],
            'payment_method' => ['required', 'in:razorpay,upi_manual'],
            'billing_cycle' => ['required', 'in:monthly,yearly'],
        ]);

        $user = $request->user();
        $newPlan = SubscriptionPlan::findOrFail($validated['plan_id']);
        $currentSubscription = $user->activeSubscription;

        // Calculate base price for the new plan
        $newPrice = $validated['billing_cycle'] === 'yearly'
            ? (float) $newPlan->price_yearly
            : (float) $newPlan->price_monthly;

        // Calculate prorated credit from current subscription
        $proratedCredit = 0;
        if ($currentSubscription && $currentSubscription->isActive()) {
            $totalDays = $currentSubscription->start_date->diffInDays($currentSubscription->end_date);
            $remainingDays = max(0, now()->diffInDays($currentSubscription->end_date, false));

            if ($totalDays > 0 && $remainingDays > 0) {
                $dailyRate = (float) $currentSubscription->amount_paid / $totalDays;
                $proratedCredit = round($dailyRate * $remainingDays, 2);
            }
        }

        $finalAmount = max(0, $newPrice - $proratedCredit);

        if ($validated['payment_method'] === 'razorpay') {
            if (! $this->razorpay->isConfigured()) {
                return back()->withErrors(['payment_method' => 'Online payment is currently unavailable.']);
            }

            $orderResult = $this->razorpay->createOrder($finalAmount, 'INR', [
                'user_id' => (string) $user->id,
                'plan_id' => (string) $newPlan->id,
                'upgrade' => 'true',
            ]);

            if (! ($orderResult['success'] ?? false)) {
                return back()->withErrors(['payment_method' => 'Failed to create payment order.']);
            }

            // Cancel the current subscription and create a new one in pending state
            DB::transaction(function () use ($currentSubscription, $user, $newPlan, $validated, $finalAmount, $orderResult) {
                if ($currentSubscription) {
                    $currentSubscription->update(['status' => 'cancelled']);
                }

                $subscription = Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $newPlan->id,
                    'status' => 'pending',
                    'payment_method' => 'razorpay',
                    'amount_paid' => $finalAmount,
                    'start_date' => now(),
                    'end_date' => $validated['billing_cycle'] === 'yearly'
                        ? now()->addYear()
                        : now()->addMonth(),
                ]);

                PaymentTransaction::create([
                    'user_id' => $user->id,
                    'subscription_id' => $subscription->id,
                    'razorpay_order_id' => $orderResult['order_id'],
                    'amount' => $finalAmount,
                    'currency' => 'INR',
                    'status' => 'pending',
                    'payment_method' => 'razorpay',
                    'notes' => json_encode([
                        'plan_name' => $newPlan->name,
                        'billing_cycle' => $validated['billing_cycle'],
                        'upgrade' => true,
                        'prorated_credit' => $proratedCredit ?? 0,
                    ]),
                ]);
            });

            return back()->with('razorpay_order', [
                'order_id' => $orderResult['order_id'],
                'amount' => (int) round($finalAmount * 100),
                'currency' => 'INR',
                'key' => $this->razorpay->getKeyId(),
                'name' => config('app.name', 'WhatsApp Monks'),
                'description' => 'Upgrade to ' . $newPlan->name,
                'prefill' => [
                    'name' => $user->name,
                    'email' => $user->email,
                    'contact' => $user->phone ?? '',
                ],
            ]);
        }

        // UPI Manual upgrade
        DB::transaction(function () use ($currentSubscription, $user, $newPlan, $validated, $finalAmount) {
            if ($currentSubscription) {
                $currentSubscription->update(['status' => 'cancelled']);
            }

            Subscription::create([
                'user_id' => $user->id,
                'plan_id' => $newPlan->id,
                'status' => 'pending',
                'payment_method' => 'upi_manual',
                'amount_paid' => $finalAmount,
                'start_date' => now(),
                'end_date' => $validated['billing_cycle'] === 'yearly'
                    ? now()->addYear()
                    : now()->addMonth(),
            ]);
        });

        return back()->with('success', 'Upgrade initiated. Please submit your UPI payment details.')
            ->with('upgrade_amount', $finalAmount)
            ->with('prorated_credit', $proratedCredit);
    }

    // -------------------------------------------------------------------------
    // POST /billing/cancel
    // -------------------------------------------------------------------------

    public function cancelRenewal(Request $request)
    {
        $user = $request->user();
        $subscription = $user->activeSubscription;

        if (! $subscription) {
            return back()->withErrors(['subscription' => 'No active subscription found.']);
        }

        $subscription->update(['status' => 'cancelled']);

        return back()->with('success', 'Auto-renewal cancelled. Your plan remains active until ' . $subscription->end_date->format('d M Y') . '.');
    }
}
