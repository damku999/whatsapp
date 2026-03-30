<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice {{ $invoiceNumber }}</title>
    <style>
        /* Reset & Base */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1a1a2e;
            background: #f8f9fa;
            line-height: 1.6;
            font-size: 14px;
        }

        .invoice-container {
            max-width: 800px;
            margin: 20px auto;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            overflow: hidden;
        }

        /* Header */
        .invoice-header {
            background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
            color: #ffffff;
            padding: 30px 40px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .invoice-header .brand h1 {
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .invoice-header .brand p {
            font-size: 13px;
            opacity: 0.9;
        }
        .invoice-header .invoice-meta {
            text-align: right;
        }
        .invoice-header .invoice-meta h2 {
            font-size: 28px;
            font-weight: 300;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-bottom: 8px;
        }
        .invoice-header .invoice-meta p {
            font-size: 13px;
            opacity: 0.9;
        }

        /* Body */
        .invoice-body { padding: 30px 40px; }

        /* Parties Row */
        .parties {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            gap: 20px;
        }
        .party {
            flex: 1;
        }
        .party h3 {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            margin-bottom: 8px;
            font-weight: 600;
        }
        .party p {
            font-size: 14px;
            margin-bottom: 2px;
        }
        .party .name {
            font-weight: 600;
            font-size: 16px;
            color: #1a1a2e;
        }

        /* Table */
        .invoice-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
        }
        .invoice-table thead th {
            background: #f1f3f5;
            padding: 12px 16px;
            text-align: left;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #555;
            font-weight: 600;
            border-bottom: 2px solid #dee2e6;
        }
        .invoice-table thead th:last-child {
            text-align: right;
        }
        .invoice-table tbody td {
            padding: 14px 16px;
            border-bottom: 1px solid #f1f3f5;
            vertical-align: top;
        }
        .invoice-table tbody td:last-child {
            text-align: right;
            font-weight: 600;
        }

        /* Summary */
        .invoice-summary {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 30px;
        }
        .summary-table {
            width: 280px;
        }
        .summary-table .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #f1f3f5;
        }
        .summary-table .row.total {
            border-bottom: none;
            border-top: 2px solid #1a1a2e;
            font-weight: 700;
            font-size: 18px;
            padding-top: 12px;
        }
        .summary-table .label { color: #666; }
        .summary-table .value { font-weight: 600; }

        /* Payment Details */
        .payment-details {
            background: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 30px;
        }
        .payment-details h3 {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            margin-bottom: 12px;
            font-weight: 600;
        }
        .payment-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .payment-grid .item {
            display: flex;
            gap: 8px;
        }
        .payment-grid .item .label {
            color: #888;
            font-size: 13px;
            min-width: 100px;
        }
        .payment-grid .item .value {
            font-weight: 600;
            font-size: 13px;
        }

        /* Status Badge */
        .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .status-completed { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-failed { background: #f8d7da; color: #721c24; }

        /* Footer */
        .invoice-footer {
            text-align: center;
            padding: 20px 40px;
            border-top: 1px solid #e0e0e0;
            color: #888;
            font-size: 12px;
        }

        /* Print Styles */
        @media print {
            body { background: #fff; }
            .invoice-container {
                margin: 0;
                border: none;
                border-radius: 0;
                box-shadow: none;
            }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    {{-- Print button --}}
    <div style="text-align: center; padding: 16px;" class="no-print">
        <button onclick="window.print()"
                style="padding: 10px 24px; background: #25d366; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
            Print / Save as PDF
        </button>
    </div>

    <div class="invoice-container">
        {{-- Header --}}
        <div class="invoice-header">
            <div class="brand">
                <h1>{{ $platformName }}</h1>
                <p>WhatsApp Marketing Platform</p>
            </div>
            <div class="invoice-meta">
                <h2>Invoice</h2>
                <p><strong>{{ $invoiceNumber }}</strong></p>
                <p>Date: {{ $date }}</p>
            </div>
        </div>

        {{-- Body --}}
        <div class="invoice-body">
            {{-- Parties --}}
            <div class="parties">
                <div class="party">
                    <h3>From</h3>
                    <p class="name">{{ $platformName }}</p>
                    <p>WhatsApp Business Solutions</p>
                </div>
                <div class="party">
                    <h3>Bill To</h3>
                    <p class="name">{{ $client['name'] }}</p>
                    @if($client['company'])
                        <p>{{ $client['company'] }}</p>
                    @endif
                    <p>{{ $client['email'] }}</p>
                    @if($client['phone'])
                        <p>{{ $client['phone'] }}</p>
                    @endif
                </div>
            </div>

            {{-- Line Items --}}
            <table class="invoice-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Billing Cycle</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <strong>{{ $plan['name'] }}</strong> Subscription
                        </td>
                        <td>{{ $plan['billing_cycle'] }}</td>
                        <td>{{ $currency }} {{ $amount }}</td>
                    </tr>
                </tbody>
            </table>

            {{-- Summary --}}
            <div class="invoice-summary">
                <div class="summary-table">
                    <div class="row">
                        <span class="label">Subtotal</span>
                        <span class="value">{{ $currency }} {{ $amount }}</span>
                    </div>
                    <div class="row total">
                        <span class="label">Total</span>
                        <span class="value">{{ $currency }} {{ $amount }}</span>
                    </div>
                </div>
            </div>

            {{-- Payment Details --}}
            <div class="payment-details">
                <h3>Payment Information</h3>
                <div class="payment-grid">
                    <div class="item">
                        <span class="label">Method:</span>
                        <span class="value">{{ $paymentMethod }}</span>
                    </div>
                    <div class="item">
                        <span class="label">Transaction ID:</span>
                        <span class="value">{{ $transactionId }}</span>
                    </div>
                    <div class="item">
                        <span class="label">Status:</span>
                        <span class="value">
                            @php
                                $badgeClass = match(strtolower($status)) {
                                    'completed' => 'status-completed',
                                    'pending' => 'status-pending',
                                    default => 'status-failed',
                                };
                            @endphp
                            <span class="status-badge {{ $badgeClass }}">{{ $status }}</span>
                        </span>
                    </div>
                    <div class="item">
                        <span class="label">Date:</span>
                        <span class="value">{{ $date }}</span>
                    </div>
                </div>
            </div>
        </div>

        {{-- Footer --}}
        <div class="invoice-footer">
            <p>Thank you for your business. This is a computer-generated invoice.</p>
            <p>{{ $platformName }} &mdash; {{ now()->year }}</p>
        </div>
    </div>
</body>
</html>
