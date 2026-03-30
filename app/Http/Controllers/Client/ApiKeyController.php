<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    /**
     * Show the API keys management page.
     */
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('ApiKeys/Index', [
            'apiKey' => $user->api_key,
            'hasSecret' => !empty($user->api_secret),
            'apiDocsUrl' => url('/api/v1'),
        ]);
    }

    /**
     * Regenerate the API key.
     */
    public function regenerate(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->generateApiKey();

        return redirect()->route('api-keys.index')
            ->with('success', 'API key regenerated successfully. Update your integrations with the new key.');
    }

    /**
     * Regenerate the API secret.
     */
    public function regenerateSecret(Request $request): RedirectResponse
    {
        $user = $request->user();
        $user->generateApiSecret();

        // Flash the decrypted secret once so the user can copy it
        $decryptedSecret = decrypt($user->api_secret);

        return redirect()->route('api-keys.index')
            ->with('success', 'API secret regenerated successfully.')
            ->with('newSecret', $decryptedSecret);
    }
}
