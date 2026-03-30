<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Client\DashboardController;
use App\Http\Controllers\Client\SessionController;
use App\Http\Controllers\Client\MessageController;
use App\Http\Controllers\Client\InboxController;
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

        // Placeholder routes (to be implemented in later milestones)
        Route::get('/contacts', fn() => Inertia::render('Contacts/Index'))->name('contacts.index');
        Route::get('/groups', fn() => Inertia::render('Groups/Index'))->name('groups.index');
        Route::get('/campaigns', fn() => Inertia::render('Campaigns/Index'))->name('campaigns.index');
        Route::get('/chatbot', fn() => Inertia::render('Chatbot/Index'))->name('chatbot.index');
        Route::get('/templates', fn() => Inertia::render('Templates/Index'))->name('templates.index');
        Route::get('/wa-groups', fn() => Inertia::render('WaGroups/Index'))->name('wa-groups.index');
        Route::get('/api-keys', fn() => Inertia::render('ApiKeys/Index'))->name('api-keys.index');
        Route::get('/webhooks', fn() => Inertia::render('Webhooks/Index'))->name('webhooks.index');
        Route::get('/reports', fn() => Inertia::render('Reports/Index'))->name('reports.index');
        Route::get('/billing', fn() => Inertia::render('Billing/Index'))->name('billing.index');
        Route::get('/support', fn() => Inertia::render('Support/Index'))->name('support.index');
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
