<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Client\DashboardController;
use App\Http\Controllers\Client\SessionController;
use App\Http\Controllers\Client\MessageController;
use App\Http\Controllers\Client\InboxController;
use App\Http\Controllers\Client\ContactController;
use App\Http\Controllers\Client\ContactGroupController;
use App\Http\Controllers\Client\WaGroupController;
use App\Http\Controllers\Client\CampaignController;
use App\Http\Controllers\Client\ChatbotController;
use App\Http\Controllers\Client\BillingController;
use App\Http\Controllers\Client\TemplateController;
use App\Http\Controllers\Client\ApiKeyController;
use App\Http\Controllers\Client\WebhookManagementController;
use App\Http\Controllers\Client\SupportController;
use App\Http\Controllers\Admin\AdminDashboardController;
use App\Http\Controllers\Admin\ClientManagementController;
use App\Http\Controllers\Admin\PlanManagementController;
use App\Http\Controllers\Admin\PaymentManagementController;
use App\Http\Controllers\Admin\SessionMonitorController;
use App\Http\Controllers\Admin\AdminSettingsController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'appName' => config('app.name'),
    ]);
});

// Client Dashboard Routes (React/Inertia)
Route::middleware(['auth', 'verified', 'active'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Client-only routes
    Route::middleware('client')->group(function () {
        // Sessions (WhatsApp session management)
        Route::prefix('sessions')->group(function () {
            Route::get('/', [SessionController::class, 'index'])->name('sessions.index');
            Route::post('/', [SessionController::class, 'store'])->name('sessions.store');
            Route::get('/{session}/qr', [SessionController::class, 'qr'])->name('sessions.qr');
            Route::post('/{session}/disconnect', [SessionController::class, 'disconnect'])->name('sessions.disconnect');
            Route::delete('/{session}', [SessionController::class, 'destroy'])->name('sessions.destroy');
        });

        // Messages (compose & history)
        Route::prefix('messages')->group(function () {
            Route::get('/', [MessageController::class, 'index'])->name('messages.index');
            Route::post('/send', [MessageController::class, 'send'])->name('messages.send');
            Route::get('/history', [MessageController::class, 'history'])->name('messages.history');
        });

        // Inbox (live chat)
        Route::prefix('inbox')->group(function () {
            Route::get('/', [InboxController::class, 'index'])->name('inbox.index');
            Route::get('/{phone}', [InboxController::class, 'show'])->name('inbox.show');
            Route::post('/{phone}/reply', [InboxController::class, 'reply'])->name('inbox.reply');
        });

        // Contacts (M4)
        Route::resource('contacts', ContactController::class)->except(['create', 'edit', 'show']);
        Route::post('contacts/import', [ContactController::class, 'import'])->name('contacts.import');
        Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
        Route::post('contacts/{contact}/opt-out', [ContactController::class, 'optOut'])->name('contacts.opt-out');
        Route::post('contacts/bulk-action', [ContactController::class, 'bulkAction'])->name('contacts.bulk-action');

        // Contact Groups (M4)
        Route::resource('groups', ContactGroupController::class)->except(['create', 'edit']);
        Route::post('groups/{group}/members', [ContactGroupController::class, 'addMembers'])->name('groups.add-members');
        Route::delete('groups/{group}/members/{contact}', [ContactGroupController::class, 'removeMember'])->name('groups.remove-member');

        // WA Groups (M4)
        Route::prefix('wa-groups')->name('wa-groups.')->group(function () {
            Route::get('/', [WaGroupController::class, 'index'])->name('index');
            Route::post('/send', [WaGroupController::class, 'send'])->name('send');
            Route::post('/extract-members', [WaGroupController::class, 'extractMembers'])->name('extract-members');
            Route::post('/create', [WaGroupController::class, 'create'])->name('create');
        });

        // Campaigns (M5)
        Route::resource('campaigns', CampaignController::class)->only(['index', 'store', 'show']);
        Route::post('campaigns/{campaign}/pause', [CampaignController::class, 'pause'])->name('campaigns.pause');
        Route::post('campaigns/{campaign}/resume', [CampaignController::class, 'resume'])->name('campaigns.resume');
        Route::post('campaigns/{campaign}/cancel', [CampaignController::class, 'cancel'])->name('campaigns.cancel');
        Route::get('campaigns/{campaign}/export', [CampaignController::class, 'export'])->name('campaigns.export');

        // Chatbot (M6)
        Route::resource('chatbot', ChatbotController::class)->except(['create', 'edit']);
        Route::post('chatbot/{flow}/toggle', [ChatbotController::class, 'toggle'])->name('chatbot.toggle');
        Route::post('chatbot/{flow}/nodes', [ChatbotController::class, 'addNode'])->name('chatbot.add-node');
        Route::put('chatbot/{flow}/nodes/{node}', [ChatbotController::class, 'updateNode'])->name('chatbot.update-node');
        Route::delete('chatbot/{flow}/nodes/{node}', [ChatbotController::class, 'deleteNode'])->name('chatbot.delete-node');
        Route::post('chatbot/{flow}/nodes/reorder', [ChatbotController::class, 'reorderNodes'])->name('chatbot.reorder-nodes');

        // Templates (M7)
        Route::resource('templates', TemplateController::class)->except(['create', 'edit', 'show']);
        Route::post('templates/{template}/preview', [TemplateController::class, 'preview'])->name('templates.preview');

        // API Keys (M7)
        Route::get('api-keys', [ApiKeyController::class, 'index'])->name('api-keys.index');
        Route::post('api-keys/regenerate', [ApiKeyController::class, 'regenerate'])->name('api-keys.regenerate');
        Route::post('api-keys/regenerate-secret', [ApiKeyController::class, 'regenerateSecret'])->name('api-keys.regenerate-secret');

        // Webhooks Management (M7)
        Route::resource('webhooks', WebhookManagementController::class)->except(['create', 'edit', 'show']);
        Route::post('webhooks/{webhook}/test', [WebhookManagementController::class, 'test'])->name('webhooks.test');
        Route::get('webhooks/{webhook}/logs', [WebhookManagementController::class, 'logs'])->name('webhooks.logs');

        // Support (M7)
        Route::get('support', [SupportController::class, 'index'])->name('support.index');
        Route::post('support', [SupportController::class, 'store'])->name('support.store');
        Route::get('support/{ticket}', [SupportController::class, 'show'])->name('support.show');
        Route::post('support/{ticket}/reply', [SupportController::class, 'reply'])->name('support.reply');

        // Billing (M8)
        Route::prefix('billing')->name('billing.')->group(function () {
            Route::get('/', [BillingController::class, 'index'])->name('index');
            Route::post('/subscribe', [BillingController::class, 'subscribe'])->name('subscribe');
            Route::post('/razorpay/verify', [BillingController::class, 'verifyRazorpay'])->name('razorpay.verify');
            Route::post('/upi-payment', [BillingController::class, 'submitUpiPayment'])->name('upi-payment');
            Route::post('/apply-coupon', [BillingController::class, 'applyCoupon'])->name('apply-coupon');
            Route::get('/invoice/{transaction}', [BillingController::class, 'downloadInvoice'])->name('invoice');
            Route::post('/upgrade', [BillingController::class, 'upgrade'])->name('upgrade');
            Route::post('/cancel', [BillingController::class, 'cancelRenewal'])->name('cancel');
        });

        // Placeholder routes (to be implemented in later milestones)
        Route::get('/reports', fn() => Inertia::render('Reports/Index'))->name('reports.index');
    });
});

// Admin Panel Routes (Blade)
Route::prefix('admin')->name('admin.')->middleware(['auth', 'admin'])->group(function () {
    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::resource('clients', ClientManagementController::class);
    Route::post('clients/{client}/suspend', [ClientManagementController::class, 'suspend'])->name('clients.suspend');
    Route::post('clients/{client}/activate', [ClientManagementController::class, 'activate'])->name('clients.activate');
    Route::resource('plans', PlanManagementController::class);
    Route::get('payments', [PaymentManagementController::class, 'index'])->name('payments.index');
    Route::post('payments/{payment}/approve', [PaymentManagementController::class, 'approve'])->name('payments.approve');
    Route::post('payments/{payment}/reject', [PaymentManagementController::class, 'reject'])->name('payments.reject');
    Route::get('sessions', [SessionMonitorController::class, 'index'])->name('sessions.index');
    Route::post('sessions/{session}/disconnect', [SessionMonitorController::class, 'disconnect'])->name('sessions.disconnect');
    Route::get('settings', [AdminSettingsController::class, 'index'])->name('settings.index');
    Route::post('settings', [AdminSettingsController::class, 'update'])->name('settings.update');
});

require __DIR__.'/auth.php';
