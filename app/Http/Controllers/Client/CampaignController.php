<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessCampaign;
use App\Models\CampaignRecipient;
use App\Models\Contact;
use App\Models\ContactGroup;
use App\Models\MessageCampaign;
use App\Models\WaSession;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CampaignController extends Controller
{
    /**
     * List campaigns with pagination.
     */
    public function index(Request $request)
    {
        $campaigns = MessageCampaign::query()
            ->with('session:id,session_name,phone_number')
            ->when($request->filled('status'), function ($q) use ($request) {
                $q->where('status', $request->input('status'));
            })
            ->when($request->filled('search'), function ($q) use ($request) {
                $q->where('name', 'like', '%' . $request->input('search') . '%');
            })
            ->latest()
            ->paginate(20)
            ->withQueryString();

        // Add progress accessor to each campaign
        $campaigns->through(function ($campaign) {
            $campaign->progress = $campaign->progress();
            return $campaign;
        });

        $sessions = WaSession::where('status', 'active')->select('id', 'session_name', 'phone_number')->get();
        $groups = ContactGroup::select('id', 'name', 'contact_count')->get();

        return Inertia::render('Campaigns/Index', [
            'campaigns' => $campaigns,
            'sessions' => $sessions,
            'groups' => $groups,
            'filters' => $request->only(['status', 'search']),
        ]);
    }

    /**
     * Create a new campaign.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'session_id' => 'required|integer|exists:wa_sessions,id',
            'message_body' => 'required|string|max:4096',
            'type' => 'required|in:text,image,video,document',
            'media' => 'nullable|file|max:16384',
            'contact_ids' => 'required_without:group_id|nullable|array',
            'contact_ids.*' => 'integer|exists:contacts,id',
            'group_id' => 'required_without:contact_ids|nullable|integer|exists:contact_groups,id',
            'delay_min' => 'nullable|integer|min:1|max:120',
            'delay_max' => 'nullable|integer|min:1|max:300|gte:delay_min',
            'scheduled_at' => 'nullable|date|after:now',
        ]);

        $user = $request->user();

        // Verify session belongs to user (global scope handles this)
        $session = WaSession::findOrFail($validated['session_id']);

        // Resolve recipient contacts
        $contactIds = [];

        if (!empty($validated['contact_ids'])) {
            // Ensure contacts belong to user via the global scope
            $contactIds = Contact::whereIn('id', $validated['contact_ids'])
                ->where('opted_out', false)
                ->pluck('id')
                ->toArray();
        } elseif (!empty($validated['group_id'])) {
            $group = ContactGroup::findOrFail($validated['group_id']);
            $contactIds = $group->contacts()
                ->where('opted_out', false)
                ->pluck('contacts.id')
                ->toArray();
        }

        if (empty($contactIds)) {
            return redirect()->back()->withErrors(['contact_ids' => 'No eligible contacts found (check opt-out status).']);
        }

        // Handle media upload
        $mediaPath = null;
        if ($request->hasFile('media')) {
            $mediaPath = $request->file('media')->store(
                'campaign-media/' . Auth::id(),
                'public'
            );
        }

        // Check monthly campaign limit
        $plan = $user->plan;
        if ($plan && $plan->max_campaigns_per_month > 0) {
            $campaignsThisMonth = MessageCampaign::where('user_id', $user->id)
                ->whereMonth('created_at', now()->month)
                ->whereYear('created_at', now()->year)
                ->count();

            if ($campaignsThisMonth >= $plan->max_campaigns_per_month) {
                return redirect()->back()->withErrors(['name' => 'You have reached your monthly campaign limit.']);
            }
        }

        $status = !empty($validated['scheduled_at']) ? 'scheduled' : 'pending';

        $campaign = MessageCampaign::create([
            'user_id' => Auth::id(),
            'session_id' => $validated['session_id'],
            'name' => $validated['name'],
            'type' => $validated['type'],
            'message_body' => $validated['message_body'],
            'media_path' => $mediaPath,
            'delay_min' => $validated['delay_min'] ?? 5,
            'delay_max' => $validated['delay_max'] ?? 15,
            'scheduled_at' => $validated['scheduled_at'] ?? null,
            'status' => $status,
            'total_count' => count($contactIds),
            'sent_count' => 0,
            'failed_count' => 0,
        ]);

        // Load contacts with phone numbers for recipients
        $contacts = Contact::whereIn('id', $contactIds)->get(['id', 'phone']);

        $recipientRecords = $contacts->map(function ($contact) use ($campaign) {
            return [
                'campaign_id' => $campaign->id,
                'contact_id' => $contact->id,
                'phone' => $contact->phone,
                'status' => 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ];
        })->toArray();

        CampaignRecipient::insert($recipientRecords);

        // Dispatch campaign processing
        if ($status === 'pending') {
            $campaign->update(['status' => 'running', 'started_at' => now()]);
            ProcessCampaign::dispatch($campaign);
        } elseif ($status === 'scheduled') {
            $delay = now()->diffInSeconds($campaign->scheduled_at);
            ProcessCampaign::dispatch($campaign)->delay($delay);
        }

        return redirect()->route('campaigns.show', $campaign)
            ->with('success', "Campaign '{$campaign->name}' created with " . count($contactIds) . ' recipients.');
    }

    /**
     * Show campaign detail with recipients.
     */
    public function show(MessageCampaign $campaign)
    {
        $campaign->load('session:id,session_name,phone_number');
        $campaign->progress = $campaign->progress();

        $recipients = $campaign->recipients()
            ->with('contact:id,name,phone')
            ->latest()
            ->paginate(50);

        $stats = [
            'total' => $campaign->total_count,
            'sent' => $campaign->sent_count,
            'failed' => $campaign->failed_count,
            'pending' => $campaign->recipients()->where('status', 'pending')->count(),
        ];

        return Inertia::render('Campaigns/Show', [
            'campaign' => $campaign,
            'recipients' => $recipients,
            'stats' => $stats,
        ]);
    }

    /**
     * Pause a running campaign.
     */
    public function pause(MessageCampaign $campaign)
    {
        if (!$campaign->isRunning()) {
            return redirect()->back()->withErrors(['status' => 'Campaign is not currently running.']);
        }

        $campaign->update(['status' => 'paused']);

        return redirect()->back()->with('success', 'Campaign paused.');
    }

    /**
     * Resume a paused campaign.
     */
    public function resume(MessageCampaign $campaign)
    {
        if (!$campaign->isPaused()) {
            return redirect()->back()->withErrors(['status' => 'Campaign is not paused.']);
        }

        $campaign->update(['status' => 'running']);

        ProcessCampaign::dispatch($campaign);

        return redirect()->back()->with('success', 'Campaign resumed.');
    }

    /**
     * Cancel a campaign.
     */
    public function cancel(MessageCampaign $campaign)
    {
        if (in_array($campaign->status, ['completed', 'cancelled'], true)) {
            return redirect()->back()->withErrors(['status' => 'Campaign is already ' . $campaign->status . '.']);
        }

        $campaign->update([
            'status' => 'cancelled',
            'completed_at' => now(),
        ]);

        // Mark remaining pending recipients as cancelled
        $campaign->recipients()
            ->where('status', 'pending')
            ->update(['status' => 'cancelled']);

        return redirect()->back()->with('success', 'Campaign cancelled.');
    }

    /**
     * Export campaign report as CSV.
     */
    public function export(MessageCampaign $campaign): StreamedResponse
    {
        $fileName = 'campaign_' . $campaign->id . '_report_' . now()->format('Y-m-d_His') . '.csv';

        return response()->streamDownload(function () use ($campaign) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Contact Name', 'Phone', 'Status', 'Sent At', 'Error']);

            $campaign->recipients()
                ->with('contact:id,name')
                ->chunk(500, function ($recipients) use ($handle) {
                    foreach ($recipients as $recipient) {
                        fputcsv($handle, [
                            $recipient->contact?->name ?? 'Unknown',
                            $recipient->phone,
                            $recipient->status,
                            $recipient->sent_at?->toDateTimeString() ?? '',
                            $recipient->error_msg ?? '',
                        ]);
                    }
                });

            fclose($handle);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }
}
