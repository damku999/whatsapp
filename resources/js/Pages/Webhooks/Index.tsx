import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface WebhookLog {
    id: number;
    status_code: number;
    response_body: string | null;
    created_at: string;
}

interface Webhook {
    id: number;
    url: string;
    events: string[];
    is_active: boolean;
    secret: string | null;
    last_triggered_at: string | null;
    failure_count: number;
    created_at: string;
    logs?: WebhookLog[];
}

interface Props {
    webhooks: Webhook[];
}

const eventOptions = [
    { value: 'message.received', label: 'Message Received', description: 'When a new message is received' },
    { value: 'message.status', label: 'Message Status', description: 'When message status changes (sent, delivered, read)' },
    { value: 'session.connected', label: 'Session Connected', description: 'When a session connects successfully' },
    { value: 'session.disconnected', label: 'Session Disconnected', description: 'When a session disconnects' },
    { value: 'campaign.completed', label: 'Campaign Completed', description: 'When a campaign finishes' },
    { value: 'contact.opted_out', label: 'Contact Opted Out', description: 'When a contact opts out' },
];

export default function WebhooksIndex({ webhooks: rawWebhooks }: Props) {
    const webhooks = Array.isArray(rawWebhooks) ? rawWebhooks : (rawWebhooks as any)?.data ?? [];

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showLogsModal, setShowLogsModal] = useState(false);
    const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
    const [newSecret, setNewSecret] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        url: '',
        events: [] as string[],
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function toggleEvent(event: string) {
        if (data.events.includes(event)) {
            setData('events', data.events.filter((e) => e !== event));
        } else {
            setData('events', [...data.events, event]);
        }
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('webhooks.store'), {
            onSuccess: (page) => {
                const secret = (page.props as any).flash?.webhook_secret;
                if (secret) {
                    setNewSecret(secret);
                } else {
                    setShowCreateModal(false);
                    reset();
                    showAlertMessage('success', 'Webhook created.');
                }
            },
            onError: () => showAlertMessage('error', 'Failed to create webhook.'),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Delete this webhook?')) return;
        router.delete(route('webhooks.destroy', id), {
            onSuccess: () => showAlertMessage('success', 'Webhook deleted.'),
        });
    }

    function handleToggle(webhook: Webhook) {
        router.post(route('webhooks.toggle', webhook.id), {}, {
            preserveState: true,
            onSuccess: () => showAlertMessage('success', `Webhook ${webhook.is_active ? 'disabled' : 'enabled'}.`),
        });
    }

    function handleTest(id: number) {
        router.post(route('webhooks.test', id), {}, {
            onSuccess: () => showAlertMessage('success', 'Test payload sent.'),
            onError: () => showAlertMessage('error', 'Failed to send test payload.'),
        });
    }

    function viewLogs(webhook: Webhook) {
        setSelectedWebhook(webhook);
        router.get(route('webhooks.index'), { logs: webhook.id }, {
            preserveState: true,
            only: ['webhooks'],
            onSuccess: (page) => {
                const updated = (page.props as unknown as Props).webhooks.find((w) => w.id === webhook.id);
                if (updated) setSelectedWebhook(updated);
                setShowLogsModal(true);
            },
        });
    }

    function closeCreateModal() {
        setShowCreateModal(false);
        setNewSecret(null);
        reset();
    }

    function copySecret() {
        if (newSecret) {
            navigator.clipboard.writeText(newSecret);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Webhooks</h2>}>
            <Head title="Webhooks" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500 text-sm">Receive real-time notifications for WhatsApp events.</p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Webhook
                </button>
            </div>

            {webhooks.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No webhooks configured</h3>
                    <p className="text-gray-500 text-sm mb-4">Set up webhooks to receive real-time event notifications.</p>
                    <button onClick={() => setShowCreateModal(true)} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                        Add Webhook
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    {webhooks.map((webhook) => (
                        <div key={webhook.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`w-2 h-2 rounded-full ${webhook.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                                        <code className="text-sm font-mono text-gray-800 truncate">{webhook.url}</code>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mb-2">
                                        {webhook.events.map((event) => (
                                            <span key={event} className="bg-[#075E54] text-white px-2 py-0.5 rounded text-xs">
                                                {event}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                                        <span>Last triggered: {webhook.last_triggered_at || 'Never'}</span>
                                        {webhook.failure_count > 0 && (
                                            <span className="text-red-500">Failures: {webhook.failure_count}</span>
                                        )}
                                        <span>Created: {webhook.created_at}</span>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 shrink-0">
                                    <button
                                        onClick={() => handleToggle(webhook)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                            webhook.is_active
                                                ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
                                                : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                        }`}
                                    >
                                        {webhook.is_active ? 'Disable' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleTest(webhook.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                                    >
                                        Test
                                    </button>
                                    <button
                                        onClick={() => viewLogs(webhook)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                                    >
                                        Logs
                                    </button>
                                    <button
                                        onClick={() => handleDelete(webhook.id)}
                                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Webhook Modal */}
            <Modal show={showCreateModal} onClose={closeCreateModal} maxWidth="lg">
                {newSecret ? (
                    <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Webhook Created</h3>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <div className="flex items-start gap-2">
                                <svg className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                                <div>
                                    <p className="text-sm text-yellow-800 font-medium">Save your webhook secret</p>
                                    <p className="text-xs text-yellow-700 mt-1">This secret will only be shown once. You will need it to verify webhook signatures.</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-4">
                            <code className="flex-1 text-sm font-mono text-gray-800 break-all">{newSecret}</code>
                            <button
                                onClick={copySecret}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                    copied ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                        <div className="flex justify-end mt-6">
                            <button onClick={closeCreateModal} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleCreate} className="p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Webhook</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                                <input
                                    type="url"
                                    value={data.url}
                                    onChange={(e) => setData('url', e.target.value)}
                                    placeholder="https://your-server.com/webhook"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                                {errors.url && <p className="text-sm text-red-600 mt-1">{errors.url}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                                <div className="space-y-2">
                                    {eventOptions.map((event) => (
                                        <label key={event.value} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={data.events.includes(event.value)}
                                                onChange={() => toggleEvent(event.value)}
                                                className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366] mt-0.5"
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-gray-700">{event.label}</p>
                                                <p className="text-xs text-gray-500">{event.description}</p>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                                {errors.events && <p className="text-sm text-red-600 mt-1">{errors.events}</p>}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button type="button" onClick={closeCreateModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                                {processing ? 'Creating...' : 'Create Webhook'}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Delivery Logs Modal */}
            <Modal show={showLogsModal} onClose={() => setShowLogsModal(false)} maxWidth="lg">
                <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Delivery Logs - <code className="text-sm text-gray-500">{selectedWebhook?.url}</code>
                    </h3>

                    {selectedWebhook?.logs && selectedWebhook.logs.length > 0 ? (
                        <div className="divide-y max-h-80 overflow-y-auto border rounded-lg">
                            {selectedWebhook.logs.map((log) => (
                                <div key={log.id} className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                                            log.status_code >= 200 && log.status_code < 300
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                        }`}>
                                            {log.status_code}
                                        </span>
                                        <span className="text-xs text-gray-500">{log.created_at}</span>
                                    </div>
                                    {log.response_body && (
                                        <pre className="text-xs text-gray-600 bg-gray-50 rounded p-2 mt-1 overflow-x-auto">
                                            {log.response_body.substring(0, 200)}
                                        </pre>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-500 text-sm">No delivery logs yet.</div>
                    )}

                    <div className="flex justify-end mt-4">
                        <button onClick={() => setShowLogsModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Close
                        </button>
                    </div>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
