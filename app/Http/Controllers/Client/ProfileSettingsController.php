<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProfileSettingsController extends Controller
{
    public function notifications(Request $request)
    {
        return Inertia::render('Settings/Notifications', [
            'preferences' => [
                'email_on_session_disconnect' => true,
                'email_on_subscription_expiry' => true,
                'email_on_campaign_complete' => true,
            ],
        ]);
    }
}
