<?php

namespace App\Services;

use App\Models\PaymentTransaction;
use Illuminate\Support\Facades\View;

class InvoiceService
{
    /**
     * Generate the invoice HTML string for a given payment transaction.
     */
    public function generate(PaymentTransaction $transaction): string
    {
        $transaction->loadMissing(['user', 'subscription.plan']);

        $data = [
            'transaction' => $transaction,
            'invoiceNumber' => 'INV-' . str_pad((string) $transaction->id, 6, '0', STR_PAD_LEFT),
            'date' => $transaction->created_at->format('d M Y'),
            'client' => [
                'name' => $transaction->user->name ?? 'N/A',
                'email' => $transaction->user->email ?? 'N/A',
                'company' => $transaction->user->company_name ?? '',
                'phone' => $transaction->user->phone ?? '',
            ],
            'plan' => [
                'name' => $transaction->subscription?->plan?->name ?? 'N/A',
                'billing_cycle' => $this->resolveBillingCycle($transaction),
            ],
            'amount' => number_format((float) $transaction->amount, 2),
            'currency' => $transaction->currency ?? 'INR',
            'paymentMethod' => ucfirst(str_replace('_', ' ', $transaction->payment_method ?? 'N/A')),
            'transactionId' => $transaction->razorpay_payment_id ?? $transaction->utr_number ?? ('TXN-' . $transaction->id),
            'status' => ucfirst($transaction->status),
            'platformName' => config('app.name', 'WhatsApp Monks'),
        ];

        return View::make('invoices.template', $data)->render();
    }

    /**
     * Save the generated invoice HTML to a temporary file and return the file path.
     * The caller is responsible for cleaning up the temp file after download.
     */
    public function generatePdf(PaymentTransaction $transaction): string
    {
        $html = $this->generate($transaction);

        $filename = 'invoice-' . str_pad((string) $transaction->id, 6, '0', STR_PAD_LEFT) . '.html';
        $path = storage_path('app/private/invoices/' . $filename);

        $dir = dirname($path);
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        file_put_contents($path, $html);

        return $path;
    }

    /**
     * Determine billing cycle label from the subscription amount vs plan pricing.
     */
    private function resolveBillingCycle(PaymentTransaction $transaction): string
    {
        $plan = $transaction->subscription?->plan;
        if (! $plan) {
            return 'N/A';
        }

        $amount = (float) $transaction->amount;
        $yearly = (float) $plan->price_yearly;

        // If the amount is closer to the yearly price, assume yearly.
        if ($yearly > 0 && abs($amount - $yearly) < abs($amount - (float) $plan->price_monthly)) {
            return 'Yearly';
        }

        return 'Monthly';
    }
}
