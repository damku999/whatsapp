<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class RazorpayService
{
    private string $keyId;

    private string $keySecret;

    private string $baseUrl = 'https://api.razorpay.com/v1';

    public function __construct()
    {
        $this->keyId = config('services.razorpay.key') ?? '';
        $this->keySecret = config('services.razorpay.secret') ?? '';
    }

    /**
     * Check whether Razorpay credentials are configured.
     */
    public function isConfigured(): bool
    {
        return $this->keyId !== '' && $this->keySecret !== '';
    }

    /**
     * Create a Razorpay order.
     *
     * @param  float  $amount   Amount in major currency unit (e.g. 499.00 INR)
     * @param  string $currency ISO currency code
     * @param  array  $notes    Arbitrary key-value metadata
     * @return array  Decoded JSON response with order_id, amount, status, etc.
     */
    public function createOrder(float $amount, string $currency = 'INR', array $notes = []): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Razorpay is not configured.'];
        }

        try {
            $response = Http::withBasicAuth($this->keyId, $this->keySecret)
                ->timeout(30)
                ->post("{$this->baseUrl}/orders", [
                    'amount' => (int) round($amount * 100), // Razorpay expects paise
                    'currency' => $currency,
                    'notes' => $notes,
                ]);

            if ($response->successful()) {
                $data = $response->json();

                return [
                    'success' => true,
                    'order_id' => $data['id'] ?? null,
                    'amount' => $data['amount'] ?? null,
                    'currency' => $data['currency'] ?? $currency,
                    'status' => $data['status'] ?? null,
                ];
            }

            Log::error('Razorpay createOrder failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return [
                'success' => false,
                'error' => 'Failed to create Razorpay order: ' . ($response->json('error.description') ?? $response->body()),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay createOrder exception', ['error' => $e->getMessage()]);

            return ['success' => false, 'error' => 'Razorpay connection failed: ' . $e->getMessage()];
        }
    }

    /**
     * Verify Razorpay payment signature.
     *
     * @param  string $orderId   Razorpay order ID (order_xxx)
     * @param  string $paymentId Razorpay payment ID (pay_xxx)
     * @param  string $signature Razorpay signature from checkout callback
     * @return bool
     */
    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        if (! $this->isConfigured()) {
            return false;
        }

        $expectedSignature = hash_hmac('sha256', $orderId . '|' . $paymentId, $this->keySecret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Fetch payment details from Razorpay.
     *
     * @param  string $paymentId Razorpay payment ID (pay_xxx)
     * @return array  Decoded JSON response
     */
    public function getPayment(string $paymentId): array
    {
        if (! $this->isConfigured()) {
            return ['success' => false, 'error' => 'Razorpay is not configured.'];
        }

        try {
            $response = Http::withBasicAuth($this->keyId, $this->keySecret)
                ->timeout(30)
                ->get("{$this->baseUrl}/payments/{$paymentId}");

            if ($response->successful()) {
                return array_merge(['success' => true], $response->json());
            }

            return [
                'success' => false,
                'error' => 'Failed to fetch payment: ' . ($response->json('error.description') ?? $response->body()),
            ];
        } catch (\Exception $e) {
            Log::error('Razorpay getPayment exception', ['error' => $e->getMessage()]);

            return ['success' => false, 'error' => 'Razorpay connection failed: ' . $e->getMessage()];
        }
    }

    /**
     * Return the public key for use in the frontend checkout script.
     */
    public function getKeyId(): string
    {
        return $this->keyId;
    }
}
