import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    summary: {
        totalMessages: number;
        sentMessages: number;
        receivedMessages: number;
        deliveredMessages: number;
        readMessages: number;
        failedMessages: number;
        deliveryRate: number;
        readRate: number;
        totalContacts: number;
        totalCampaigns: number;
        totalApiCalls: number;
    };
    messagesPerDay: { date: string; count: number }[];
    campaigns: {
        id: number;
        name: string;
        status: string;
        total: number;
        sent: number;
        failed: number;
        delivery_rate: number;
        date: string;
    }[];
    apiUsage: { total_calls: number; active_days: number; success: number; errors: number };
    apiPerDay: { date: string; count: number }[];
    topEndpoints: { endpoint: string; method: string; count: number }[];
    contactGrowth: { date: string; count: number }[];
    failedMessages: { id: number; to_number: string; message_type: string; error_msg: string; created_at: string }[];
    days: number;
}

export default function Reports({ summary, messagesPerDay: rawMessagesPerDay, campaigns: rawCampaigns, apiUsage, apiPerDay, topEndpoints: rawTopEndpoints, contactGrowth: rawContactGrowth, failedMessages: rawFailedMessages, days }: Props) {
    const messagesPerDay = Array.isArray(rawMessagesPerDay) ? rawMessagesPerDay : (rawMessagesPerDay as any)?.data ?? [];
    const campaigns = Array.isArray(rawCampaigns) ? rawCampaigns : (rawCampaigns as any)?.data ?? [];
    const topEndpoints = Array.isArray(rawTopEndpoints) ? rawTopEndpoints : (rawTopEndpoints as any)?.data ?? [];
    const contactGrowth = Array.isArray(rawContactGrowth) ? rawContactGrowth : (rawContactGrowth as any)?.data ?? [];
    const failedMessages = Array.isArray(rawFailedMessages) ? rawFailedMessages : (rawFailedMessages as any)?.data ?? [];

    const [selectedDays, setSelectedDays] = useState(days);

    const changePeriod = (d: number) => {
        setSelectedDays(d);
        router.get(route('reports.index'), { days: d }, { preserveState: true });
    };

    const exportReport = (type: string) => {
        window.location.href = route('reports.export') + `?type=${type}&days=${selectedDays}`;
    };

    const maxMsgCount = Math.max(...(messagesPerDay?.map(d => d.count) || [1]), 1);

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Reports & Analytics</h2>}>
            <Head title="Reports" />

            {/* Period Selector */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex gap-2">
                    {[7, 14, 30, 90].map(d => (
                        <button key={d} onClick={() => changePeriod(d)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${selectedDays === d ? 'bg-[#25D366] text-white' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}>
                            {d}d
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => exportReport('messages')} className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">Export Messages</button>
                    <button onClick={() => exportReport('contacts')} className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">Export Contacts</button>
                    <button onClick={() => exportReport('campaigns')} className="px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">Export Campaigns</button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                {[
                    { label: 'Messages Sent', value: summary.sentMessages, color: 'text-blue-600' },
                    { label: 'Delivered', value: summary.deliveredMessages, color: 'text-green-600' },
                    { label: 'Read', value: summary.readMessages, color: 'text-purple-600' },
                    { label: 'Failed', value: summary.failedMessages, color: 'text-red-600' },
                    { label: 'Delivery Rate', value: `${summary.deliveryRate}%`, color: 'text-[#128C7E]' },
                    { label: 'Read Rate', value: `${summary.readRate}%`, color: 'text-[#075E54]' },
                ].map(card => (
                    <div key={card.label} className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
                        <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                        <p className={`text-xl font-bold ${card.color}`}>{typeof card.value === 'number' ? card.value.toLocaleString() : card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Messages Per Day Bar Chart */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Messages Per Day</h3>
                    {messagesPerDay && messagesPerDay.length > 0 ? (
                        <div className="flex items-end gap-1 h-40">
                            {messagesPerDay.map((d, i) => (
                                <div key={i} className="flex-1 flex flex-col items-center group relative">
                                    <div className="absolute -top-6 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap">
                                        {d.date}: {d.count}
                                    </div>
                                    <div className="w-full bg-[#25D366] rounded-t transition-all hover:bg-[#128C7E]"
                                        style={{ height: `${(d.count / maxMsgCount) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }} />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm text-center py-8">No data for this period</p>
                    )}
                </div>

                {/* Contact Growth */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Contact Growth</h3>
                    <div className="flex items-center gap-4 mb-4">
                        <span className="text-3xl font-bold text-[#075E54]">{summary.totalContacts.toLocaleString()}</span>
                        <span className="text-sm text-gray-500">total contacts</span>
                    </div>
                    {contactGrowth && contactGrowth.length > 0 ? (
                        <div className="flex items-end gap-1 h-24">
                            {contactGrowth.map((d, i) => {
                                const max = Math.max(...contactGrowth.map(x => x.count), 1);
                                return (
                                    <div key={i} className="flex-1 bg-purple-400 rounded-t hover:bg-purple-500 transition"
                                        style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                                        title={`${d.date}: ${d.count} new`} />
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-400 text-sm text-center py-4">No new contacts in this period</p>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Campaign Performance */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-800">Campaign Performance</h3>
                        <span className="text-sm text-gray-500">{summary.totalCampaigns} campaigns</span>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Campaign</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Delivery</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rate</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {campaigns && campaigns.length > 0 ? campaigns.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2">
                                            <p className="text-sm font-medium">{c.name}</p>
                                            <p className="text-xs text-gray-400">{c.date}</p>
                                        </td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 text-xs rounded-full ${c.status === 'completed' ? 'bg-green-100 text-green-700' : c.status === 'running' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                                        </td>
                                        <td className="px-4 py-2 text-sm">{c.sent}/{c.total}</td>
                                        <td className="px-4 py-2 text-sm font-medium">{c.delivery_rate}%</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No campaigns</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* API Usage */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b">
                        <h3 className="font-semibold text-gray-800">API Usage</h3>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="bg-blue-50 rounded-lg p-3">
                                <p className="text-xs text-blue-600">Total Calls</p>
                                <p className="text-xl font-bold text-blue-700">{(apiUsage?.total_calls ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-xs text-green-600">Success</p>
                                <p className="text-xl font-bold text-green-700">{(apiUsage?.success ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3">
                                <p className="text-xs text-red-600">Errors</p>
                                <p className="text-xl font-bold text-red-700">{(apiUsage?.errors ?? 0).toLocaleString()}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                                <p className="text-xs text-purple-600">Active Days</p>
                                <p className="text-xl font-bold text-purple-700">{apiUsage?.active_days ?? 0}</p>
                            </div>
                        </div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Top Endpoints</h4>
                        <div className="space-y-1">
                            {topEndpoints && topEndpoints.length > 0 ? topEndpoints.slice(0, 5).map((ep, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span className="text-gray-600"><span className="font-mono text-xs bg-gray-100 px-1 rounded">{ep.method}</span> {ep.endpoint}</span>
                                    <span className="font-medium">{ep.count}</span>
                                </div>
                            )) : (
                                <p className="text-gray-400 text-sm">No API calls yet</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Failed Messages */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800">Failed Messages</h3>
                    <span className="text-sm text-red-500">{summary.failedMessages} total</span>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Phone</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Error</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {failedMessages && failedMessages.length > 0 ? failedMessages.map(msg => (
                                <tr key={msg.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 text-sm font-mono">{msg.to_number}</td>
                                    <td className="px-4 py-2 text-sm">{msg.message_type}</td>
                                    <td className="px-4 py-2 text-sm text-red-600 max-w-xs truncate">{msg.error_msg || 'Unknown error'}</td>
                                    <td className="px-4 py-2 text-sm text-gray-500">{new Date(msg.created_at).toLocaleDateString()}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400 text-sm">No failed messages</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
