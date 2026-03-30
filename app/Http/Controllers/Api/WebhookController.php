<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class WebhookController extends Controller
{
    public function index(Request $request)
    {
        $webhooks = $request->user()->webhooks()->get();
        return response()->json(['success' => true, 'data' => $webhooks]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'url' => 'required|url',
            'events' => 'required|array',
        ]);

        $webhook = $request->user()->webhooks()->create([
            'url' => $validated['url'],
            'events_json' => $validated['events'],
            'secret' => bin2hex(random_bytes(32)),
        ]);

        return response()->json(['success' => true, 'data' => $webhook], 201);
    }
}
