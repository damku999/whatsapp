<?php

namespace App\Http\Controllers\Client;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\MessageCampaign;
use App\Models\ApiLog;
use App\Models\Contact;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $days = $request->input('days', 30);
        $startDate = now()->subDays($days)->startOfDay();

        // Message stats
        $messageStats = $user->messages()
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                COUNT(*) as total,
                SUM(CASE WHEN direction = 'outgoing' THEN 1 ELSE 0 END) as sent,
                SUM(CASE WHEN direction = 'incoming' THEN 1 ELSE 0 END) as received,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
                SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END) as read_count,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
            ")
            ->first();

        // Messages per day chart data
        $messagesPerDay = $user->messages()
            ->where('created_at', '>=', $startDate)
            ->where('direction', 'outgoing')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Campaign performance
        $campaigns = $user->campaigns()
            ->where('created_at', '>=', $startDate)
            ->select('id', 'name', 'status', 'total_count', 'sent_count', 'failed_count', 'created_at')
            ->latest()
            ->take(20)
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'status' => $c->status,
                'total' => $c->total_count,
                'sent' => $c->sent_count,
                'failed' => $c->failed_count,
                'delivery_rate' => $c->total_count > 0 ? round(($c->sent_count / $c->total_count) * 100, 1) : 0,
                'date' => $c->created_at->format('M d, Y'),
            ]);

        // API usage
        $apiUsage = ApiLog::where('user_id', $user->id)
            ->where('created_at', '>=', $startDate)
            ->selectRaw("
                COUNT(*) as total_calls,
                COUNT(DISTINCT DATE(created_at)) as active_days,
                SUM(CASE WHEN response_code >= 200 AND response_code < 300 THEN 1 ELSE 0 END) as success,
                SUM(CASE WHEN response_code >= 400 THEN 1 ELSE 0 END) as errors
            ")
            ->first();

        // API calls per day
        $apiPerDay = ApiLog::where('user_id', $user->id)
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Top API endpoints
        $topEndpoints = ApiLog::where('user_id', $user->id)
            ->where('created_at', '>=', $startDate)
            ->selectRaw('endpoint, method, COUNT(*) as count')
            ->groupBy('endpoint', 'method')
            ->orderByDesc('count')
            ->take(10)
            ->get();

        // Contact growth
        $contactGrowth = $user->contacts()
            ->where('created_at', '>=', $startDate)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date')
            ->get();

        // Failed messages
        $failedMessages = $user->messages()
            ->where('status', 'failed')
            ->where('created_at', '>=', $startDate)
            ->select('id', 'to_number', 'message_type', 'error_msg', 'created_at')
            ->latest()
            ->take(50)
            ->get();

        // Summary
        $summary = [
            'totalMessages' => $messageStats->total ?? 0,
            'sentMessages' => $messageStats->sent ?? 0,
            'receivedMessages' => $messageStats->received ?? 0,
            'deliveredMessages' => $messageStats->delivered ?? 0,
            'readMessages' => $messageStats->read_count ?? 0,
            'failedMessages' => $messageStats->failed ?? 0,
            'deliveryRate' => ($messageStats->sent ?? 0) > 0
                ? round((($messageStats->delivered ?? 0) / $messageStats->sent) * 100, 1)
                : 0,
            'readRate' => ($messageStats->delivered ?? 0) > 0
                ? round((($messageStats->read_count ?? 0) / $messageStats->delivered) * 100, 1)
                : 0,
            'totalContacts' => $user->contacts()->count(),
            'totalCampaigns' => $user->campaigns()->where('created_at', '>=', $startDate)->count(),
            'totalApiCalls' => $apiUsage->total_calls ?? 0,
        ];

        return Inertia::render('Reports/Index', [
            'summary' => $summary,
            'messagesPerDay' => $messagesPerDay,
            'campaigns' => $campaigns,
            'apiUsage' => $apiUsage,
            'apiPerDay' => $apiPerDay,
            'topEndpoints' => $topEndpoints,
            'contactGrowth' => $contactGrowth,
            'failedMessages' => $failedMessages,
            'days' => $days,
        ]);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $type = $request->input('type', 'messages');
        $days = $request->input('days', 30);
        $startDate = now()->subDays($days);

        $filename = "whatsapp-monks-{$type}-report-" . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($user, $type, $startDate) {
            $file = fopen('php://output', 'w');

            if ($type === 'messages') {
                fputcsv($file, ['ID', 'To/From', 'Direction', 'Type', 'Content', 'Status', 'Sent At', 'Delivered At', 'Read At']);
                $user->messages()
                    ->where('created_at', '>=', $startDate)
                    ->orderBy('created_at', 'desc')
                    ->chunk(500, function ($messages) use ($file) {
                        foreach ($messages as $msg) {
                            fputcsv($file, [
                                $msg->id,
                                $msg->direction === 'outgoing' ? $msg->to_number : $msg->from_number,
                                $msg->direction,
                                $msg->message_type,
                                substr($msg->content ?? '', 0, 200),
                                $msg->status,
                                $msg->sent_at,
                                $msg->delivered_at,
                                $msg->read_at,
                            ]);
                        }
                    });
            } elseif ($type === 'contacts') {
                fputcsv($file, ['ID', 'Name', 'Phone', 'Email', 'Tags', 'Opted Out', 'Created At']);
                $user->contacts()
                    ->orderBy('created_at', 'desc')
                    ->chunk(500, function ($contacts) use ($file) {
                        foreach ($contacts as $contact) {
                            fputcsv($file, [
                                $contact->id,
                                $contact->name,
                                $contact->phone,
                                $contact->email,
                                is_array($contact->tags) ? implode(', ', $contact->tags) : '',
                                $contact->opted_out ? 'Yes' : 'No',
                                $contact->created_at,
                            ]);
                        }
                    });
            } elseif ($type === 'campaigns') {
                fputcsv($file, ['ID', 'Name', 'Status', 'Total', 'Sent', 'Failed', 'Delivery Rate', 'Created At']);
                $user->campaigns()
                    ->where('created_at', '>=', $startDate)
                    ->orderBy('created_at', 'desc')
                    ->chunk(100, function ($campaigns) use ($file) {
                        foreach ($campaigns as $c) {
                            fputcsv($file, [
                                $c->id,
                                $c->name,
                                $c->status,
                                $c->total_count,
                                $c->sent_count,
                                $c->failed_count,
                                $c->total_count > 0 ? round(($c->sent_count / $c->total_count) * 100, 1) . '%' : '0%',
                                $c->created_at,
                            ]);
                        }
                    });
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
