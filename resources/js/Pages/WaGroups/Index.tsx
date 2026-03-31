import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface WaGroup {
    id: string;
    name: string;
    members_count: number;
    is_admin: boolean;
    description?: string;
}

interface Session {
    id: number;
    session_name: string;
    phone_number: string;
    status: string;
}

interface Contact {
    id: number;
    name: string | null;
    phone: string;
}

interface Props {
    groups: WaGroup[];
    sessions: Session[];
    contacts: Contact[];
}

export default function WaGroupsIndex({ groups: rawGroups, sessions: rawSessions, contacts: rawContacts }: Props) {
    const groups = Array.isArray(rawGroups) ? rawGroups : (rawGroups as any)?.data ?? [];
    const sessions = Array.isArray(rawSessions) ? rawSessions : (rawSessions as any)?.data ?? [];
    const contacts = Array.isArray(rawContacts) ? rawContacts : (rawContacts as any)?.data ?? [];

    const [selectedSession, setSelectedSession] = useState<number | string>(sessions?.find((s: any) => s.status === 'active')?.id || '');
    const [showSendModal, setShowSendModal] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<WaGroup | null>(null);
    const [participantSearch, setParticipantSearch] = useState('');
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const sendForm = useForm({
        session_id: '' as string,
        group_id: '',
        message: '',
        type: 'text',
    });

    const createForm = useForm({
        session_id: '' as string,
        name: '',
        participants: [] as string[],
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function loadGroups(sessionId: string) {
        setSelectedSession(Number(sessionId) || '');
        router.get(route('wa-groups.index'), { session_id: sessionId }, { preserveState: true });
    }

    function openSendModal(group: WaGroup) {
        setSelectedGroup(group);
        sendForm.setData({
            session_id: String(selectedSession),
            group_id: group.id,
            message: '',
            type: 'text',
        });
        setShowSendModal(true);
    }

    function handleSend(e: React.FormEvent) {
        e.preventDefault();
        sendForm.post(route('wa-groups.send'), {
            onSuccess: () => {
                setShowSendModal(false);
                sendForm.reset();
                showAlertMessage('success', 'Message sent to group.');
            },
            onError: () => showAlertMessage('error', 'Failed to send message.'),
        });
    }

    function handleExtractMembers(groupId: string) {
        if (!confirm('Extract all members from this group and save them as contacts?')) return;
        router.post(route('wa-groups.extract-members'), {
            session_id: selectedSession,
            group_id: groupId,
        }, {
            onSuccess: () => showAlertMessage('success', 'Members extracted and saved as contacts.'),
            onError: () => showAlertMessage('error', 'Failed to extract members.'),
        });
    }

    function openCreateModal() {
        createForm.setData({
            session_id: String(selectedSession),
            name: '',
            participants: [],
        });
        setParticipantSearch('');
        setShowCreateModal(true);
    }

    function toggleParticipant(phone: string) {
        const current = createForm.data.participants;
        if (current.includes(phone)) {
            createForm.setData('participants', current.filter((p) => p !== phone));
        } else {
            createForm.setData('participants', [...current, phone]);
        }
    }

    function handleCreateGroup(e: React.FormEvent) {
        e.preventDefault();
        createForm.post(route('wa-groups.create'), {
            onSuccess: () => {
                setShowCreateModal(false);
                createForm.reset();
                showAlertMessage('success', 'WhatsApp group created successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to create group.'),
        });
    }

    const filteredContacts = contacts?.filter(
        (c) =>
            participantSearch === '' ||
            (c.name || '').toLowerCase().includes(participantSearch.toLowerCase()) ||
            c.phone.includes(participantSearch)
    ) || [];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">WhatsApp Groups</h2>}>
            <Head title="WhatsApp Groups" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Session:</label>
                    <select
                        value={selectedSession}
                        onChange={(e) => loadGroups(e.target.value)}
                        className="rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                    >
                        <option value="">Select Session</option>
                        {sessions?.filter((s) => s.status === 'active').map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.session_name} ({s.phone_number})
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    onClick={openCreateModal}
                    disabled={!selectedSession}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Group
                </button>
            </div>

            {!selectedSession ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">Select a Session</h3>
                    <p className="text-gray-500 text-sm">Choose an active session to view its WhatsApp groups.</p>
                </div>
            ) : groups && groups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#128C7E] rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {group.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-800">{group.name}</h4>
                                        <p className="text-xs text-gray-500">{group.members_count} members</p>
                                    </div>
                                </div>
                                {group.is_admin && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                        Admin
                                    </span>
                                )}
                            </div>

                            {group.description && (
                                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    onClick={() => openSendModal(group)}
                                    className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-xs font-medium hover:bg-[#128C7E] transition"
                                >
                                    Send Message
                                </button>
                                <button
                                    onClick={() => handleExtractMembers(group.id)}
                                    className="flex-1 bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition"
                                >
                                    Extract Members
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No groups found</h3>
                    <p className="text-gray-500 text-sm">This session is not part of any WhatsApp groups, or groups are still loading.</p>
                </div>
            )}

            {/* Send to Group Modal */}
            <Modal show={showSendModal} onClose={() => setShowSendModal(false)} maxWidth="md">
                <form onSubmit={handleSend} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Send to Group</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        {selectedGroup?.name} ({selectedGroup?.members_count} members)
                    </p>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                        <textarea
                            value={sendForm.data.message}
                            onChange={(e) => sendForm.setData('message', e.target.value)}
                            rows={4}
                            placeholder="Type your message..."
                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                        />
                        {sendForm.errors.message && <p className="text-sm text-red-600 mt-1">{sendForm.errors.message}</p>}
                    </div>

                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={() => setShowSendModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={sendForm.processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                            {sendForm.processing ? 'Sending...' : 'Send Message'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Create Group Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="lg">
                <form onSubmit={handleCreateGroup} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Create WhatsApp Group</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                            <input
                                type="text"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="Enter group name"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {createForm.errors.name && <p className="text-sm text-red-600 mt-1">{createForm.errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Add Participants</label>
                            <input
                                type="text"
                                value={participantSearch}
                                onChange={(e) => setParticipantSearch(e.target.value)}
                                placeholder="Search contacts by name or phone..."
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm mb-2"
                            />

                            {createForm.data.participants.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {createForm.data.participants.map((phone) => {
                                        const contact = contacts?.find((c) => c.phone === phone);
                                        return (
                                            <span key={phone} className="inline-flex items-center gap-1 bg-[#075E54] text-white px-2.5 py-1 rounded-full text-xs">
                                                {contact?.name || phone}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleParticipant(phone)}
                                                    className="hover:text-red-200"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                                {filteredContacts.length === 0 ? (
                                    <p className="p-4 text-center text-sm text-gray-500">No contacts found.</p>
                                ) : (
                                    filteredContacts.map((contact) => (
                                        <label key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={createForm.data.participants.includes(contact.phone)}
                                                onChange={() => toggleParticipant(contact.phone)}
                                                className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-700 truncate">{contact.name || 'Unknown'}</p>
                                                <p className="text-xs text-gray-500">{contact.phone}</p>
                                            </div>
                                        </label>
                                    ))
                                )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                                {createForm.data.participants.length} participant{createForm.data.participants.length !== 1 ? 's' : ''} selected
                            </p>
                            {createForm.errors.participants && <p className="text-sm text-red-600 mt-1">{createForm.errors.participants}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowCreateModal(false); createForm.reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing || createForm.data.participants.length === 0}
                            className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50"
                        >
                            {createForm.processing ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
