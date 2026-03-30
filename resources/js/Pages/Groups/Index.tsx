import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface Contact {
    id: number;
    name: string | null;
    phone: string;
}

interface Group {
    id: number;
    name: string;
    description: string | null;
    contacts_count: number;
    contacts?: Contact[];
    created_at: string;
}

interface Props {
    groups: Group[];
    contacts: Contact[];
}

export default function GroupsIndex({ groups, contacts }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showMembersModal, setShowMembersModal] = useState(false);
    const [showAddMemberModal, setShowAddMemberModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
    const [memberSearch, setMemberSearch] = useState('');
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        description: '',
    });

    const addMemberForm = useForm({
        contact_ids: [] as number[],
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('groups.store'), {
            onSuccess: () => {
                reset();
                setShowCreateModal(false);
                showAlertMessage('success', 'Group created successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to create group.'),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this group?')) return;
        router.delete(route('groups.destroy', id), {
            onSuccess: () => showAlertMessage('success', 'Group deleted.'),
            onError: () => showAlertMessage('error', 'Failed to delete group.'),
        });
    }

    function viewMembers(group: Group) {
        setSelectedGroup(group);
        setShowMembersModal(true);
        router.get(route('groups.show', group.id), {}, {
            preserveState: true,
            only: ['groups'],
            onSuccess: (page) => {
                const updated = (page.props as unknown as Props).groups.find((g) => g.id === group.id);
                if (updated) setSelectedGroup(updated);
            },
        });
    }

    function handleRemoveMember(groupId: number, contactId: number) {
        router.post(route('groups.remove-member', groupId), { contact_id: contactId }, {
            preserveState: true,
            onSuccess: () => {
                if (selectedGroup) {
                    setSelectedGroup({
                        ...selectedGroup,
                        contacts: selectedGroup.contacts?.filter((c) => c.id !== contactId),
                        contacts_count: selectedGroup.contacts_count - 1,
                    });
                }
                showAlertMessage('success', 'Member removed.');
            },
        });
    }

    function handleAddMembers(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedGroup) return;
        addMemberForm.post(route('groups.add-members', selectedGroup.id), {
            preserveState: true,
            onSuccess: () => {
                addMemberForm.reset();
                setShowAddMemberModal(false);
                viewMembers(selectedGroup);
                showAlertMessage('success', 'Members added to group.');
            },
            onError: () => showAlertMessage('error', 'Failed to add members.'),
        });
    }

    function toggleMemberSelection(contactId: number) {
        const ids = addMemberForm.data.contact_ids;
        if (ids.includes(contactId)) {
            addMemberForm.setData('contact_ids', ids.filter((id) => id !== contactId));
        } else {
            addMemberForm.setData('contact_ids', [...ids, contactId]);
        }
    }

    const existingMemberIds = selectedGroup?.contacts?.map((c) => c.id) || [];
    const availableContacts = contacts.filter(
        (c) => !existingMemberIds.includes(c.id) &&
            (memberSearch === '' || (c.name || c.phone).toLowerCase().includes(memberSearch.toLowerCase()))
    );

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Contact Groups</h2>}>
            <Head title="Groups" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500 text-sm">Organize contacts into groups for targeted campaigns.</p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Group
                </button>
            </div>

            {groups.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No groups yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Create a group to organize your contacts.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                    >
                        Create Group
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((group) => (
                        <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#128C7E] rounded-lg flex items-center justify-center text-white">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-800">{group.name}</h3>
                                        <p className="text-xs text-gray-500">{group.contacts_count} contact{group.contacts_count !== 1 ? 's' : ''}</p>
                                    </div>
                                </div>
                            </div>

                            {group.description && (
                                <p className="text-sm text-gray-500 mb-4 line-clamp-2">{group.description}</p>
                            )}

                            <p className="text-xs text-gray-400 mb-3">Created: {group.created_at}</p>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => viewMembers(group)}
                                    className="flex-1 bg-[#075E54] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#128C7E] transition"
                                >
                                    View Members
                                </button>
                                <button
                                    onClick={() => handleDelete(group.id)}
                                    className="bg-red-50 text-red-600 text-xs font-medium py-2 px-3 rounded-lg hover:bg-red-100 transition border border-red-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Group Modal */}
            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreate} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Group</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., VIP Customers"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                placeholder="Brief description of this group..."
                                rows={3}
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowCreateModal(false); reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                            {processing ? 'Creating...' : 'Create Group'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* View Members Modal */}
            <Modal show={showMembersModal} onClose={() => setShowMembersModal(false)} maxWidth="lg">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">
                            {selectedGroup?.name} - Members
                        </h3>
                        <button
                            onClick={() => {
                                addMemberForm.reset();
                                setMemberSearch('');
                                setShowAddMemberModal(true);
                            }}
                            className="inline-flex items-center gap-1 bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#128C7E] transition"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Members
                        </button>
                    </div>

                    {selectedGroup?.contacts && selectedGroup.contacts.length > 0 ? (
                        <div className="divide-y max-h-80 overflow-y-auto">
                            {selectedGroup.contacts.map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-bold">
                                            {(contact.name || contact.phone).charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">{contact.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">{contact.phone}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveMember(selectedGroup.id, contact.id)}
                                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-8 text-center text-gray-500 text-sm">
                            No members in this group yet.
                        </div>
                    )}

                    <div className="flex justify-end mt-4">
                        <button onClick={() => setShowMembersModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Close
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Add Members Modal */}
            <Modal show={showAddMemberModal} onClose={() => setShowAddMemberModal(false)} maxWidth="md">
                <form onSubmit={handleAddMembers} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Members to {selectedGroup?.name}</h3>

                    <input
                        type="text"
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search contacts..."
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm mb-3"
                    />

                    <div className="max-h-60 overflow-y-auto border rounded-lg divide-y">
                        {availableContacts.length === 0 ? (
                            <p className="p-4 text-center text-sm text-gray-500">No available contacts found.</p>
                        ) : (
                            availableContacts.map((contact) => (
                                <label key={contact.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={addMemberForm.data.contact_ids.includes(contact.id)}
                                        onChange={() => toggleMemberSelection(contact.id)}
                                        className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                                    />
                                    <div>
                                        <p className="text-sm font-medium text-gray-800">{contact.name || 'Unknown'}</p>
                                        <p className="text-xs text-gray-500">{contact.phone}</p>
                                    </div>
                                </label>
                            ))
                        )}
                    </div>

                    {addMemberForm.data.contact_ids.length > 0 && (
                        <p className="text-sm text-[#075E54] mt-2 font-medium">
                            {addMemberForm.data.contact_ids.length} contact{addMemberForm.data.contact_ids.length !== 1 ? 's' : ''} selected
                        </p>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setShowAddMemberModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={addMemberForm.processing || addMemberForm.data.contact_ids.length === 0}
                            className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50"
                        >
                            {addMemberForm.processing ? 'Adding...' : 'Add Selected'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
