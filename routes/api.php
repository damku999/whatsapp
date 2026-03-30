<?php

use App\Http\Controllers\Api\CampaignController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\GroupController;
use App\Http\Controllers\Api\MessageApiController;
use App\Http\Controllers\Api\SessionApiController;
use App\Http\Controllers\Api\WebhookController;
use App\Http\Controllers\Internal\WebhookController as InternalWebhookController;
use Illuminate\Support\Facades\Route;

// Internal webhook from Node.js WhatsApp Engine
Route::prefix('internal')->group(function () {
    Route::post('/webhook', [InternalWebhookController::class, 'handle']);
});

// Client API v1 (authenticated via API key)
Route::prefix('v1')->middleware(['api.key'])->group(function () {

    // Messages
    Route::post('/message/send', [MessageApiController::class, 'send'])
        ->middleware('throttle.api:send');
    Route::post('/message/send-media', [MessageApiController::class, 'sendMedia'])
        ->middleware('throttle.api:send');
    Route::post('/message/send-bulk', [MessageApiController::class, 'sendBulk'])
        ->middleware('throttle.api:send-bulk');
    Route::get('/message/{id}/status', [MessageApiController::class, 'status'])
        ->middleware('throttle.api:read');

    // Number check
    Route::get('/number/check', [SessionApiController::class, 'checkNumber'])
        ->middleware('throttle.api:read');

    // Session
    Route::get('/session/status', [SessionApiController::class, 'status'])
        ->middleware('throttle.api:read');

    // Contacts
    Route::apiResource('contacts', ContactController::class)
        ->middleware('throttle.api:read');
    Route::post('/contacts/import', [ContactController::class, 'import'])
        ->middleware('throttle.api:send');

    // Groups
    Route::apiResource('groups', GroupController::class)
        ->middleware('throttle.api:read');
    Route::post('/groups/{id}/members', [GroupController::class, 'addMembers'])
        ->middleware('throttle.api:send');
    Route::delete('/groups/{id}/members/{contact_id}', [GroupController::class, 'removeMember'])
        ->middleware('throttle.api:send');

    // Campaigns
    Route::apiResource('campaigns', CampaignController::class)
        ->only(['index', 'store', 'show'])
        ->middleware('throttle.api:read');
    Route::get('/campaigns/{id}/status', [CampaignController::class, 'status'])
        ->middleware('throttle.api:read');

    // Webhooks
    Route::apiResource('webhooks', WebhookController::class)
        ->middleware('throttle.api:read');
    Route::post('/webhooks/{id}/test', [WebhookController::class, 'test'])
        ->middleware('throttle.api:send');
});
