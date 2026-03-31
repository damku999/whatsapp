import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';

interface Reply {
    id: number;
    message: string;
    is_admin: boolean;
    user_name: string;
    created_at: string;
}

interface Ticket {
    id: number;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
    replies_count?: number;
    replies?: Reply[];
    initial_message?: string;
}

interface Props {
    tickets: { data: Ticket[] } | Ticket[];
    selectedTicket?: Ticket | null;
}

const statusColors: Record<string, { bg: string; text: string }> = {
    open: { bg: 'bg-blue-100', text: 'text-blue-700' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    resolved: { bg: 'bg-green-100', text: 'text-green-700' },
    closed: { bg: 'bg-gray-100', text: 'text-gray-600' },
};

const priorityConfig: Record<string, { color: string; label: string }> = {
    low: { color: 'text-gray-500', label: 'Low' },
    medium: { color: 'text-yellow-600', label: 'Medium' },
    high: { color: 'text-red-600', label: 'High' },
};

export default function SupportIndex({ tickets: rawTickets, selectedTicket }: Props) {
    const tickets = Array.isArray(rawTickets) ? rawTickets : (rawTickets?.data ?? []);
    const [showNewModal, setShowNewModal] = useState(false);
    const [viewingTicket, setViewingTicket] = useState<Ticket | null>(selectedTicket || null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const repliesEndRef = useRef<HTMLDivElement>(null);

    const createForm = useForm({
        subject: '',
        message: '',
        priority: 'medium',
    });

    const replyForm = useForm({
        message: '',
    });

    useEffect(() => {
        repliesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [viewingTicket?.replies]);

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function handleCreateTicket(e: React.FormEvent) {
        e.preventDefault();
        createForm.post(route('support.store'), {
            onSuccess: () => {
                createForm.reset();
                setShowNewModal(false);
                showAlertMessage('success', 'Ticket created successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to create ticket.'),
        });
    }

    function handleViewTicket(ticket: Ticket) {
        router.get(route('support.show', ticket.id), {}, {
            preserveState: true,
            only: ['selectedTicket'],
            onSuccess: (page) => {
                const st = (page.props as any).selectedTicket;
                if (st) setViewingTicket(st);
            },
        });
    }

    function handleReply(e: React.FormEvent) {
        e.preventDefault();
        if (!viewingTicket || !replyForm.data.message.trim()) return;
        replyForm.post(route('support.reply', viewingTicket.id), {
            preserveState: true,
            onSuccess: () => {
                replyForm.reset();
                handleViewTicket(viewingTicket);
            },
            onError: () => showAlertMessage('error', 'Failed to send reply.'),
        });
    }

    function getStatusStyle(status: string) {
        return statusColors[status] || statusColors.open;
    }

    function getPriorityStyle(priority: string) {
        return priorityConfig[priority] || priorityConfig.medium;
    }

    if (viewingTicket) {
        const st = getStatusStyle(viewingTicket.status);
        const pr = getPriorityStyle(viewingTicket.priority);

        return (
            <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Support</h2>}>
                <Head title={`Ticket #${viewingTicket.id}`} />

                <button
                    onClick={() => setViewingTicket(null)}
                    className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Tickets
                </button>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Ticket Header */}
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400 font-mono">#{viewingTicket.id}</span>
                                    <h3 className="font-semibold text-gray-800">{viewingTicket.subject}</h3>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Created: {viewingTicket.created_at}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${st.bg} ${st.text}`}>
                                    {viewingTicket.status.replace('_', ' ')}
                                </span>
                                <span className={`text-xs font-medium ${pr.color}`}>
                                    {pr.label} Priority
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Thread */}
                    <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto bg-gray-50/50">
                        {/* Initial message */}
                        {viewingTicket.initial_message && (
                            <div className="flex justify-end">
                                <div className="max-w-[80%] bg-[#DCF8C6] rounded-lg rounded-tr-none px-4 py-3 shadow-sm">
                                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewingTicket.initial_message}</p>
                                    <p className="text-[10px] text-gray-500 mt-1 text-right">{viewingTicket.created_at}</p>
                                </div>
                            </div>
                        )}

                        {viewingTicket.replies && viewingTicket.replies.length > 0 ? (
                            viewingTicket.replies.map((reply) => (
                                <div
                                    key={reply.id}
                                    className={`flex ${reply.is_admin ? 'justify-start' : 'justify-end'}`}
                                >
                                    <div className={`max-w-[80%] rounded-lg px-4 py-3 shadow-sm ${
                                        reply.is_admin
                                            ? 'bg-white rounded-tl-none border'
                                            : 'bg-[#DCF8C6] rounded-tr-none'
                                    }`}>
                                        <p className={`text-xs font-medium mb-1 ${reply.is_admin ? 'text-[#075E54]' : 'text-gray-600'}`}>
                                            {reply.is_admin ? 'Support Team' : reply.user_name}
                                        </p>
                                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{reply.message}</p>
                                        <p className="text-[10px] text-gray-500 mt-1 text-right">{reply.created_at}</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            !viewingTicket.initial_message && (
                                <div className="text-center text-gray-400 text-sm py-8">
                                    No messages yet. Write your first message below.
                                </div>
                            )
                        )}
                        <div ref={repliesEndRef} />
                    </div>

                    {/* Reply Box */}
                    {viewingTicket.status !== 'closed' && (
                        <form onSubmit={handleReply} className="p-4 border-t flex items-end gap-3">
                            <textarea
                                value={replyForm.data.message}
                                onChange={(e) => replyForm.setData('message', e.target.value)}
                                rows={2}
                                placeholder="Type your reply..."
                                className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleReply(e);
                                    }
                                }}
                            />
                            <button
                                type="submit"
                                disabled={replyForm.processing || !replyForm.data.message.trim()}
                                className="bg-[#25D366] text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50"
                            >
                                {replyForm.processing ? 'Sending...' : 'Reply'}
                            </button>
                        </form>
                    )}

                    {viewingTicket.status === 'closed' && (
                        <div className="p-4 border-t bg-gray-50 text-center text-sm text-gray-500">
                            This ticket has been closed. Create a new ticket if you need further assistance.
                        </div>
                    )}
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Support</h2>}>
            <Head title="Support" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500 text-sm">Need help? Create a support ticket and we will get back to you.</p>
                <button
                    onClick={() => setShowNewModal(true)}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Ticket
                </button>
            </div>

            {tickets.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No support tickets</h3>
                    <p className="text-gray-500 text-sm mb-4">Everything running smoothly? Create a ticket if you need help.</p>
                    <button onClick={() => setShowNewModal(true)} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                        New Ticket
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {tickets.map((ticket) => {
                                    const st = getStatusStyle(ticket.status);
                                    const pr = getPriorityStyle(ticket.priority);
                                    return (
                                        <tr key={ticket.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewTicket(ticket)}>
                                            <td className="px-6 py-3 text-gray-400 font-mono">#{ticket.id}</td>
                                            <td className="px-6 py-3 font-medium text-gray-800">
                                                {ticket.subject}
                                                {ticket.replies_count && ticket.replies_count > 0 && (
                                                    <span className="ml-2 text-xs text-gray-400">({ticket.replies_count} replies)</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`text-sm font-medium capitalize ${pr.color}`}>{pr.label}</span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium ${st.bg} ${st.text}`}>
                                                    {ticket.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-gray-500">{ticket.created_at}</td>
                                            <td className="px-6 py-3 text-right">
                                                <button className="text-[#128C7E] hover:text-[#075E54] text-sm font-medium">
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* New Ticket Modal */}
            <Modal show={showNewModal} onClose={() => setShowNewModal(false)} maxWidth="md">
                <form onSubmit={handleCreateTicket} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Support Ticket</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                            <input
                                type="text"
                                value={createForm.data.subject}
                                onChange={(e) => createForm.setData('subject', e.target.value)}
                                placeholder="Brief description of your issue"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {createForm.errors.subject && <p className="text-sm text-red-600 mt-1">{createForm.errors.subject}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                            <select
                                value={createForm.data.priority}
                                onChange={(e) => createForm.setData('priority', e.target.value)}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                            <textarea
                                value={createForm.data.message}
                                onChange={(e) => createForm.setData('message', e.target.value)}
                                rows={5}
                                placeholder="Describe your issue in detail..."
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                            />
                            {createForm.errors.message && <p className="text-sm text-red-600 mt-1">{createForm.errors.message}</p>}
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowNewModal(false); createForm.reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={createForm.processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                            {createForm.processing ? 'Submitting...' : 'Submit Ticket'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
