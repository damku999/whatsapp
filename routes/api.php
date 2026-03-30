<?php

use App\Http\Controllers\Internal\WebhookController;
use Illuminate\Support\Facades\Route;

// Internal webhook from Node.js WhatsApp Engine
Route::prefix('internal')->group(function () {
    Route::post('/webhook', [WebhookController::class, 'handle']);
});

// Client API v1 (authenticated via API key)
Route::prefix('v1')->middleware('api.key')->group(function () {
    // These will be implemented in Milestone 7
    Route::post('/message/send', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::post('/message/send-media', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::post('/message/send-bulk', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::get('/number/check', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::get('/message/{id}/status', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::apiResource('contacts', \App\Http\Controllers\Api\ContactController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::apiResource('groups', \App\Http\Controllers\Api\GroupController::class)->only(['index', 'store']);
    Route::post('/groups/{id}/members', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::apiResource('campaigns', \App\Http\Controllers\Api\CampaignController::class)->only(['index', 'store']);
    Route::get('/campaigns/{id}/status', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::get('/session/status', fn() => response()->json(['message' => 'Coming soon'], 501));
    Route::apiResource('webhooks', \App\Http\Controllers\Api\WebhookController::class)->only(['index', 'store']);
});
