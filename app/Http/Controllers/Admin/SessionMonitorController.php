<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\WaSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class SessionMonitorController extends Controller
{
    public function index()
    {
        $sessions = WaSession::with('user:id,name,email,company_name')
            ->latest('last_active_at')
            ->paginate(20);

        return view('admin.sessions.index', compact('sessions'));
    }

    public function disconnect(WaSession $session)
    {
        try {
            Http::withHeaders([
                'X-Internal-Secret' => config('services.wa_engine.secret'),
            ])->post(config('services.wa_engine.url') . '/session/' . $session->engine_session_id . '/disconnect');

            $session->update(['status' => 'disconnected']);
        } catch (\Exception $e) {
            $session->update(['status' => 'disconnected']);
        }

        return back()->with('success', 'Session disconnected.');
    }
}
