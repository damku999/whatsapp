<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportController extends Controller
{
    /**
     * Display a listing of support tickets.
     */
    public function index(Request $request): Response
    {
        $tickets = $request->user()
            ->supportTickets()
            ->withCount('replies')
            ->orderByRaw("CASE WHEN status = 'open' THEN 0 WHEN status = 'in_progress' THEN 1 WHEN status = 'awaiting_reply' THEN 2 ELSE 3 END")
            ->orderBy('updated_at', 'desc')
            ->paginate(20);

        return Inertia::render('Support/Index', [
            'tickets' => $tickets,
        ]);
    }

    /**
     * Store a newly created support ticket.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
            'priority' => 'nullable|in:low,medium,high,urgent',
        ]);

        $ticket = $request->user()->supportTickets()->create([
            'subject' => $validated['subject'],
            'status' => 'open',
            'priority' => $validated['priority'] ?? 'medium',
        ]);

        // Create the initial message as the first reply
        $ticket->replies()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
            'is_admin_reply' => false,
        ]);

        return redirect()->route('support.show', $ticket->id)
            ->with('success', 'Support ticket created successfully.');
    }

    /**
     * Display the specified support ticket with replies.
     */
    public function show(Request $request, $id): Response
    {
        $ticket = $request->user()
            ->supportTickets()
            ->findOrFail($id);

        $replies = $ticket->replies()
            ->with('user:id,name,role')
            ->orderBy('created_at', 'asc')
            ->get();

        return Inertia::render('Support/Show', [
            'ticket' => $ticket,
            'replies' => $replies,
        ]);
    }

    /**
     * Add a reply to the support ticket.
     */
    public function reply(Request $request, $id): RedirectResponse
    {
        $ticket = $request->user()
            ->supportTickets()
            ->findOrFail($id);

        $validated = $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $ticket->replies()->create([
            'user_id' => $request->user()->id,
            'message' => $validated['message'],
            'is_admin_reply' => false,
        ]);

        // Update ticket status to indicate client has replied
        if ($ticket->status === 'awaiting_reply') {
            $ticket->update(['status' => 'open']);
        }

        $ticket->touch();

        return redirect()->route('support.show', $ticket->id)
            ->with('success', 'Reply added successfully.');
    }
}
