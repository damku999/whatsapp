import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Session {
    id: number;
    name: string;
    status: string;
}

interface Group {
    id: number;
    name: string;
    contacts_count: number;
}

interface Contact {
    id: number;
    name: string | null;
    phone: string;
}

interface Recipient {
    id: number;
    contact_name: string | null;
    contact_phone: string;
    status: string;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_reason: string | null;
}

interface Campaign {
    id: number;
    name: string;
    status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled';
    session_name: string;
    total_recipients: number;
    sent_count: number;
    delivered_count: number;
    failed_count: number;
    scheduled_at: string | null;
    created_at: string;
    completed_at: string | null;
    message_type: string;
    message_body: string | null;
}

interface Props {
    campaigns: Campaign[];
    sessions: Session[];
    groups: Group[];
    contacts: Contact[];
    selectedCampaign?: Campaign & { recipients: Recipient[] };
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Draft' },
    scheduled: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scheduled' },
    running: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Running' },
    paused: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Paused' },
    completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
    cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'Cancelled' },
};

const recipientStatus: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-700',
};

export default function CampaignsIndex({ campaigns, sessions, groups, contacts, selectedCampaign }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [showDetail, setShowDetail] = useState(!!selectedCampaign);
    const [viewCampaign, setViewCampaign] = useState<(Campaign & { recipients: Recipient[] }) | null>(selectedCampaign || null);
    const [audienceType, setAudienceType] = useState<'group' | 'contacts'>('group');
    const [scheduleType, setScheduleType] = useState<'now' | 'later'>('now');
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        session_id: '',
        group_id: '',
        contact_ids: [] as number[],
        message_type: 'text',
        message_body: '',
        media: null as File | null,
        delay_min: '1',
        delay_max: '3',
        scheduled_at: '',
        send_now: true,
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('campaigns.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setShowCreate(false);
                showAlertMessage('success', 'Campaign created successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to create campaign.'),
        });
    }

    function handleAction(campaignId: number, action: string) {
        const confirmActions = ['cancel', 'delete'];
        if (confirmActions.includes(action)) {
            if (!confirm(`Are you sure you want to ${action} this campaign?`)) return;
        }
        router.post(route(`campaigns.${action}`, campaignId), {}, {
            onSuccess: () => showAlertMessage('success', `Campaign ${action}d.`),
            onError: () => showAlertMessage('error', `Failed to ${action} campaign.`),
        });
    }

    function viewDetail(campaign: Campaign) {
        router.get(route('campaigns.show', campaign.id), {}, {
            preserveState: true,
            only: ['selectedCampaign'],
            onSuccess: (page) => {
                const sc = (page.props as any).selectedCampaign;
                if (sc) {
                    setViewCampaign(sc);
                    setShowDetail(true);
                }
            },
        });
    }

    function toggleContactSelection(id: number) {
        const ids = data.contact_ids;
        if (ids.includes(id)) {
            setData('contact_ids', ids.filter((i) => i !== id));
        } else {
            setData('contact_ids', [...ids, id]);
        }
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Campaigns</h2>}>
            <Head title="Campaigns" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            {showDetail && viewCampaign ? (
                /* Campaign Detail View */
                <div>
                    <button
                        onClick={() => { setShowDetail(false); setViewCampaign(null); }}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Campaigns
                    </button>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-gray-800">{viewCampaign.name}</h3>
                                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${statusConfig[viewCampaign.status]?.bg} ${statusConfig[viewCampaign.status]?.text}`}>
                                        {statusConfig[viewCampaign.status]?.label}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-500 mt-1">Session: {viewCampaign.session_name}</p>
                            </div>
                            <div className="flex gap-2">
                                {viewCampaign.status === 'running' && (
                                    <button onClick={() => handleAction(viewCampaign.id, 'pause')} className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-4 py-2 rounded-lg text-sm hover:bg-yellow-100 transition">
                                        Pause
                                    </button>
                                )}
                                {viewCampaign.status === 'paused' && (
                                    <button onClick={() => handleAction(viewCampaign.id, 'resume')} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#128C7E] transition">
                                        Resume
                                    </button>
                                )}
                                {['running', 'paused', 'scheduled'].includes(viewCampaign.status) && (
                                    <button onClick={() => handleAction(viewCampaign.id, 'cancel')} className="bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition">
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            <div className="bg-gray-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-gray-800">{viewCampaign.total_recipients}</p>
                                <p className="text-xs text-gray-500">Total</p>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-blue-700">{viewCampaign.sent_count}</p>
                                <p className="text-xs text-blue-600">Sent</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-green-700">{viewCampaign.delivered_count}</p>
                                <p className="text-xs text-green-600">Delivered</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-3 text-center">
                                <p className="text-2xl font-bold text-red-700">{viewCampaign.failed_count}</p>
                                <p className="text-xs text-red-600">Failed</p>
                            </div>
                        </div>

                        {viewCampaign.total_recipients > 0 && (
                            <div className="mt-4">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div
                                        className="bg-[#25D366] h-2.5 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.round((viewCampaign.sent_count / viewCampaign.total_recipients) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1 text-right">
                                    {Math.round((viewCampaign.sent_count / viewCampaign.total_recipients) * 100)}% complete
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b">
                            <h4 className="font-semibold text-gray-800">Recipients</h4>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Delivered At</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {viewCampaign.recipients && viewCampaign.recipients.length > 0 ? (
                                        viewCampaign.recipients.map((r) => (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-800">{r.contact_name || '-'}</td>
                                                <td className="px-6 py-3 text-gray-600">{r.contact_phone}</td>
                                                <td className="px-6 py-3">
                                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${recipientStatus[r.status] || 'bg-gray-100 text-gray-600'}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500">{r.sent_at || '-'}</td>
                                                <td className="px-6 py-3 text-gray-500">{r.delivered_at || '-'}</td>
                                                <td className="px-6 py-3 text-red-500 text-xs">{r.failed_reason || '-'}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No recipients data available.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : showCreate ? (
                /* Create Campaign Form */
                <div>
                    <button
                        onClick={() => setShowCreate(false)}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Campaigns
                    </button>

                    <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-6">Create Campaign</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Name</label>
                                <input
                                    type="text"
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    placeholder="e.g., Holiday Promotion"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                <select
                                    value={data.session_id}
                                    onChange={(e) => setData('session_id', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                >
                                    <option value="">Select session</option>
                                    {sessions.filter((s) => s.status === 'active').map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                                {errors.session_id && <p className="text-sm text-red-600 mt-1">{errors.session_id}</p>}
                            </div>
                        </div>

                        {/* Audience */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Audience</label>
                            <div className="flex gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => setAudienceType('group')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                                        audienceType === 'group' ? 'border-[#25D366] bg-green-50 text-[#075E54]' : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    Contact Group
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAudienceType('contacts')}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                                        audienceType === 'contacts' ? 'border-[#25D366] bg-green-50 text-[#075E54]' : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    Select Contacts
                                </button>
                            </div>

                            {audienceType === 'group' ? (
                                <select
                                    value={data.group_id}
                                    onChange={(e) => setData('group_id', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                >
                                    <option value="">Select a group</option>
                                    {groups.map((g) => (
                                        <option key={g.id} value={g.id}>{g.name} ({g.contacts_count} contacts)</option>
                                    ))}
                                </select>
                            ) : (
                                <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                                    {contacts.map((c) => (
                                        <label key={c.id} className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.contact_ids.includes(c.id)}
                                                onChange={() => toggleContactSelection(c.id)}
                                                className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                                            />
                                            <span className="text-sm text-gray-700">{c.name || c.phone}</span>
                                            <span className="text-xs text-gray-400 ml-auto">{c.phone}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                value={data.message_body}
                                onChange={(e) => setData('message_body', e.target.value)}
                                rows={4}
                                placeholder="Type your campaign message..."
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                            />
                            {errors.message_body && <p className="text-sm text-red-600 mt-1">{errors.message_body}</p>}
                            <p className="text-xs text-gray-400 mt-1">Use {'{{name}}'} and {'{{phone}}'} for personalization.</p>
                        </div>

                        {/* Delay */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Delay (seconds)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.delay_min}
                                    onChange={(e) => setData('delay_min', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Delay (seconds)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={data.delay_max}
                                    onChange={(e) => setData('delay_max', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                            </div>
                        </div>

                        {/* Schedule */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Schedule</label>
                            <div className="flex gap-3 mb-3">
                                <button
                                    type="button"
                                    onClick={() => { setScheduleType('now'); setData('send_now', true); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                                        scheduleType === 'now' ? 'border-[#25D366] bg-green-50 text-[#075E54]' : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    Send Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setScheduleType('later'); setData('send_now', false); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                                        scheduleType === 'later' ? 'border-[#25D366] bg-green-50 text-[#075E54]' : 'border-gray-200 text-gray-600'
                                    }`}
                                >
                                    Schedule for Later
                                </button>
                            </div>
                            {scheduleType === 'later' && (
                                <input
                                    type="datetime-local"
                                    value={data.scheduled_at}
                                    onChange={(e) => setData('scheduled_at', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                            )}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowCreate(false); reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing} className="bg-[#25D366] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                                {processing ? 'Creating...' : 'Create Campaign'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* Campaign List */
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-gray-500 text-sm">Send bulk messages to contacts with smart delays.</p>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Campaign
                        </button>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-800 mb-2">No campaigns yet</h3>
                            <p className="text-gray-500 text-sm mb-4">Create your first campaign to send bulk messages.</p>
                            <button onClick={() => setShowCreate(true)} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                                Create Campaign
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Session</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Scheduled</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {campaigns.map((campaign) => {
                                            const st = statusConfig[campaign.status] || statusConfig.draft;
                                            const progress = campaign.total_recipients > 0
                                                ? Math.round((campaign.sent_count / campaign.total_recipients) * 100)
                                                : 0;
                                            return (
                                                <tr key={campaign.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewDetail(campaign)}>
                                                    <td className="px-6 py-3 font-medium text-gray-800">{campaign.name}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${st.bg} ${st.text}`}>
                                                            {st.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 bg-gray-200 rounded-full h-1.5">
                                                                <div className="bg-[#25D366] h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="text-xs text-gray-500">{campaign.sent_count}/{campaign.total_recipients}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-3 text-gray-600 hidden md:table-cell">{campaign.session_name}</td>
                                                    <td className="px-6 py-3 text-gray-500 hidden lg:table-cell">{campaign.scheduled_at || 'Immediate'}</td>
                                                    <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-1">
                                                            {campaign.status === 'running' && (
                                                                <button onClick={() => handleAction(campaign.id, 'pause')} className="text-yellow-600 hover:text-yellow-800 p-1" title="Pause">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            {campaign.status === 'paused' && (
                                                                <button onClick={() => handleAction(campaign.id, 'resume')} className="text-green-600 hover:text-green-800 p-1" title="Resume">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                            {['running', 'paused', 'scheduled'].includes(campaign.status) && (
                                                                <button onClick={() => handleAction(campaign.id, 'cancel')} className="text-red-500 hover:text-red-700 p-1" title="Cancel">
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                    </svg>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
