<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppEngineService
{
    private string $baseUrl;
    private string $secret;
    private int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('services.wa_engine.url') ?? '', '/');
        $this->secret = config('services.wa_engine.secret') ?? '';
        $this->timeout = 30;
    }

    // -------------------------------------------------------------------------
    // Session Management
    // -------------------------------------------------------------------------

    /**
     * Start a new WhatsApp session on the engine.
     */
    public function startSession(string $sessionId, string $authType = 'qr'): array
    {
        return $this->post('/session/start', [
            'session_id' => $sessionId,
            'auth_type' => $authType,
        ]);
    }

    /**
     * Get current status of a session from the engine.
     */
    public function getSessionStatus(string $sessionId): array
    {
        return $this->get("/session/{$sessionId}/status");
    }

    /**
     * Disconnect an active session on the engine.
     */
    public function disconnectSession(string $sessionId): array
    {
        return $this->post("/session/{$sessionId}/disconnect");
    }

    /**
     * Get all sessions known by the engine.
     */
    public function getAllSessions(): array
    {
        return $this->get('/sessions');
    }

    // -------------------------------------------------------------------------
    // Messaging
    // -------------------------------------------------------------------------

    /**
     * Send a single message through the engine.
     */
    public function sendMessage(
        string $sessionId,
        string $to,
        string $type,
        ?string $content,
        ?string $mediaUrl = null,
        ?string $quotedMsgId = null,
    ): array {
        $payload = [
            'session_id' => $sessionId,
            'to' => $to,
            'type' => $type,
            'content' => $content,
        ];

        if ($mediaUrl !== null) {
            $payload['media_url'] = $mediaUrl;
        }

        if ($quotedMsgId !== null) {
            $payload['quoted_msg_id'] = $quotedMsgId;
        }

        return $this->post('/message/send', $payload);
    }

    /**
     * Send bulk messages through the engine.
     */
    public function sendBulk(
        string $sessionId,
        array $recipients,
        string $content,
        string $type = 'text',
        int $delayMin = 3,
        int $delayMax = 8,
        ?string $mediaUrl = null,
    ): array {
        $payload = [
            'session_id' => $sessionId,
            'recipients' => $recipients,
            'content' => $content,
            'type' => $type,
            'delay_min' => $delayMin,
            'delay_max' => $delayMax,
        ];

        if ($mediaUrl !== null) {
            $payload['media_url'] = $mediaUrl;
        }

        return $this->post('/message/send-bulk', $payload);
    }

    // -------------------------------------------------------------------------
    // Contacts
    // -------------------------------------------------------------------------

    /**
     * Check whether a phone number is registered on WhatsApp.
     */
    public function checkNumber(string $sessionId, string $phone): array
    {
        return $this->get("/contacts/{$sessionId}/check", [
            'phone' => $phone,
        ]);
    }

    // -------------------------------------------------------------------------
    // Groups
    // -------------------------------------------------------------------------

    /**
     * Get all groups visible to the session.
     */
    public function getGroups(string $sessionId): array
    {
        return $this->get("/groups/{$sessionId}/list");
    }

    /**
     * Get members of a specific group.
     */
    public function getGroupMembers(string $sessionId, string $groupId): array
    {
        return $this->get("/groups/{$sessionId}/{$groupId}/members");
    }

    /**
     * Create a new WhatsApp group.
     */
    public function createGroup(string $sessionId, string $name, array $participants): array
    {
        return $this->post("/groups/{$sessionId}/create", [
            'name' => $name,
            'participants' => $participants,
        ]);
    }

    // -------------------------------------------------------------------------
    // Group Messaging
    // -------------------------------------------------------------------------

    /**
     * Send a message to a WhatsApp group.
     */
    public function sendGroupMessage(
        string $sessionId,
        string $groupJid,
        string $content,
        ?string $mediaUrl = null,
    ): array {
        $payload = [
            'session_id' => $sessionId,
            'group_id' => $groupJid,
            'content' => $content,
        ];

        if ($mediaUrl !== null) {
            $payload['media_url'] = $mediaUrl;
        }

        return $this->post("/groups/{$sessionId}/send", $payload);
    }

    // -------------------------------------------------------------------------
    // Interactive Messages (Chatbot)
    // -------------------------------------------------------------------------

    /**
     * Send a button message (used by chatbot flows).
     */
    public function sendButtonMessage(
        string $sessionId,
        string $to,
        string $body,
        array $buttons,
    ): array {
        return $this->post('/message/send-buttons', [
            'session_id' => $sessionId,
            'to' => $to,
            'body' => $body,
            'buttons' => $buttons,
        ]);
    }

    /**
     * Send a list message (used by chatbot flows).
     */
    public function sendListMessage(
        string $sessionId,
        string $to,
        string $body,
        string $buttonText,
        array $sections,
    ): array {
        return $this->post('/message/send-list', [
            'session_id' => $sessionId,
            'to' => $to,
            'body' => $body,
            'button_text' => $buttonText,
            'sections' => $sections,
        ]);
    }

    // -------------------------------------------------------------------------
    // Status / Stories
    // -------------------------------------------------------------------------

    /**
     * Post a WhatsApp status (story).
     */
    public function postStatus(
        string $sessionId,
        string $type,
        ?string $content = null,
        ?string $mediaUrl = null,
    ): array {
        $payload = [
            'type' => $type,
        ];

        if ($content !== null) {
            $payload['content'] = $content;
        }

        if ($mediaUrl !== null) {
            $payload['media_url'] = $mediaUrl;
        }

        return $this->post("/status/{$sessionId}/post", $payload);
    }

    // -------------------------------------------------------------------------
    // Health
    // -------------------------------------------------------------------------

    /**
     * Get health status of the Node.js engine.
     */
    public function getHealth(): array
    {
        return $this->get('/health');
    }

    // -------------------------------------------------------------------------
    // Internal HTTP helpers
    // -------------------------------------------------------------------------

    /**
     * Build a pre-configured HTTP client for engine requests.
     */
    private function client(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->timeout($this->timeout)
            ->withHeaders([
                'X-Internal-Secret' => $this->secret,
                'Accept' => 'application/json',
            ]);
    }

    /**
     * Execute a GET request against the engine.
     */
    private function get(string $path, array $query = []): array
    {
        try {
            $response = $this->client()->get($path, $query);

            return $response->json() ?? ['success' => false, 'error' => 'Empty response from engine'];
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('WhatsApp Engine connection failed', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => 'Engine connection failed: ' . $e->getMessage()];
        } catch (\Exception $e) {
            Log::error('WhatsApp Engine request failed', [
                'method' => 'GET',
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Execute a POST request against the engine.
     */
    private function post(string $path, array $data = []): array
    {
        try {
            $response = $this->client()->post($path, $data);

            return $response->json() ?? ['success' => false, 'error' => 'Empty response from engine'];
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            Log::error('WhatsApp Engine connection failed', [
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => 'Engine connection failed: ' . $e->getMessage()];
        } catch (\Exception $e) {
            Log::error('WhatsApp Engine request failed', [
                'method' => 'POST',
                'path' => $path,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}
