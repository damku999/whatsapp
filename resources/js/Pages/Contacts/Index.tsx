import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { useState, useRef } from 'react';

interface Contact {
    id: number;
    name: string | null;
    phone: string;
    email: string | null;
    tags: string[];
    opted_out: boolean;
    created_at: string;
    messages_count?: number;
}

interface PaginatedContacts {
    data: Contact[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    links: { url: string | null; label: string; active: boolean }[];
}

interface Props {
    contacts: PaginatedContacts;
    filters: {
        search?: string;
        tag?: string;
        opted_out?: string;
    };
    allTags: string[];
}

export default function ContactsIndex({ contacts, filters, allTags }: Props) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showDetailPanel, setShowDetailPanel] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [bulkAction, setBulkAction] = useState('');
    const [bulkTag, setBulkTag] = useState('');
    const [search, setSearch] = useState(filters.search || '');
    const [tagFilter, setTagFilter] = useState(filters.tag || '');
    const [optedOutFilter, setOptedOutFilter] = useState(filters.opted_out || '');
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [importPreview, setImportPreview] = useState<string[][] | null>(null);
    const [columnMapping, setColumnMapping] = useState<Record<number, string>>({});
    const csvInputRef = useRef<HTMLInputElement>(null);

    const addForm = useForm({
        name: '',
        phone: '',
        email: '',
        tags: '' as string,
    });

    const importForm = useForm<{ file: File | null }>({
        file: null,
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function applyFilters() {
        router.get(route('contacts.index'), {
            search: search || undefined,
            tag: tagFilter || undefined,
            opted_out: optedOutFilter || undefined,
        }, { preserveState: true, preserveScroll: true });
    }

    function handleAddContact(e: React.FormEvent) {
        e.preventDefault();
        addForm.post(route('contacts.store'), {
            onSuccess: () => {
                addForm.reset();
                setShowAddModal(false);
                showAlertMessage('success', 'Contact added successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to add contact.'),
        });
    }

    function handleCsvChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        importForm.setData('file', file);

        const reader = new FileReader();
        reader.onload = (ev) => {
            const text = ev.target?.result as string;
            const lines = text.split('\n').filter((l) => l.trim());
            const rows = lines.slice(0, 6).map((l) => l.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
            setImportPreview(rows);
            const header = rows[0];
            const mapping: Record<number, string> = {};
            header.forEach((col, i) => {
                const lower = col.toLowerCase();
                if (lower.includes('name')) mapping[i] = 'name';
                else if (lower.includes('phone') || lower.includes('mobile') || lower.includes('number')) mapping[i] = 'phone';
                else if (lower.includes('email') || lower.includes('mail')) mapping[i] = 'email';
                else if (lower.includes('tag')) mapping[i] = 'tags';
                else mapping[i] = 'skip';
            });
            setColumnMapping(mapping);
        };
        reader.readAsText(file);
    }

    function handleImport(e: React.FormEvent) {
        e.preventDefault();
        if (!importForm.data.file) return;
        importForm.post(route('contacts.import'), {
            forceFormData: true,
            onSuccess: () => {
                importForm.reset();
                setShowImportModal(false);
                setImportPreview(null);
                setColumnMapping({});
                showAlertMessage('success', 'Contacts imported successfully.');
            },
            onError: () => showAlertMessage('error', 'Failed to import contacts.'),
        });
    }

    function handleExport() {
        window.location.href = route('contacts.export', {
            search: search || undefined,
            tag: tagFilter || undefined,
            opted_out: optedOutFilter || undefined,
        });
    }

    function toggleSelectAll() {
        if (selectedIds.length === contacts.data.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(contacts.data.map((c) => c.id));
        }
    }

    function toggleSelect(id: number) {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }

    function handleBulkAction() {
        if (!bulkAction || selectedIds.length === 0) return;
        if (bulkAction === 'delete') {
            if (!confirm(`Are you sure you want to delete ${selectedIds.length} contacts?`)) return;
            router.post(route('contacts.bulk-delete'), { ids: selectedIds }, {
                onSuccess: () => {
                    setSelectedIds([]);
                    setBulkAction('');
                    showAlertMessage('success', 'Contacts deleted.');
                },
            });
        } else if (bulkAction === 'add_tag' && bulkTag) {
            router.post(route('contacts.bulk-tag'), { ids: selectedIds, tag: bulkTag }, {
                onSuccess: () => {
                    setSelectedIds([]);
                    setBulkAction('');
                    setBulkTag('');
                    showAlertMessage('success', 'Tag added to contacts.');
                },
            });
        }
    }

    function handleDelete(id: number) {
        if (!confirm('Delete this contact?')) return;
        router.delete(route('contacts.destroy', id), {
            onSuccess: () => showAlertMessage('success', 'Contact deleted.'),
        });
    }

    function openDetail(contact: Contact) {
        setSelectedContact(contact);
        setShowDetailPanel(true);
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Contacts</h2>}>
            <Head title="Contacts" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                <div className="flex flex-col sm:flex-row gap-2 flex-1">
                    <div className="relative flex-1 max-w-md">
                        <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                            placeholder="Search by name, phone, or email..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-gray-300 focus:border-[#25D366] focus:ring-[#25D366]"
                        />
                    </div>
                    <select
                        value={tagFilter}
                        onChange={(e) => { setTagFilter(e.target.value); }}
                        className="rounded-lg border-gray-300 text-sm focus:border-[#25D366] focus:ring-[#25D366]"
                    >
                        <option value="">All Tags</option>
                        {allTags.map((tag) => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                    <select
                        value={optedOutFilter}
                        onChange={(e) => { setOptedOutFilter(e.target.value); }}
                        className="rounded-lg border-gray-300 text-sm focus:border-[#25D366] focus:ring-[#25D366]"
                    >
                        <option value="">All Status</option>
                        <option value="0">Active</option>
                        <option value="1">Opted Out</option>
                    </select>
                    <button
                        onClick={applyFilters}
                        className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200 transition"
                    >
                        Filter
                    </button>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="inline-flex items-center gap-1.5 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Contact
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Import CSV
                    </button>
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center gap-1.5 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 transition"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export
                    </button>
                </div>
            </div>

            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-blue-700 font-medium">{selectedIds.length} selected</span>
                    <select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value)}
                        className="rounded-lg border-blue-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                        <option value="">Choose action...</option>
                        <option value="delete">Delete</option>
                        <option value="add_tag">Add Tag</option>
                    </select>
                    {bulkAction === 'add_tag' && (
                        <input
                            type="text"
                            value={bulkTag}
                            onChange={(e) => setBulkTag(e.target.value)}
                            placeholder="Tag name"
                            className="rounded-lg border-blue-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                    )}
                    <button
                        onClick={handleBulkAction}
                        disabled={!bulkAction}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
                    >
                        Apply
                    </button>
                    <button onClick={() => setSelectedIds([])} className="text-sm text-blue-600 hover:underline ml-auto">
                        Clear selection
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={contacts.data.length > 0 && selectedIds.length === contacts.data.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tags</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {contacts.data.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                                        No contacts found. Add your first contact or import from CSV.
                                    </td>
                                </tr>
                            ) : (
                                contacts.data.map((contact) => (
                                    <tr
                                        key={contact.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => openDetail(contact)}
                                    >
                                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(contact.id)}
                                                onChange={() => toggleSelect(contact.id)}
                                                className="rounded border-gray-300 text-[#25D366] focus:ring-[#25D366]"
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">{contact.name || '-'}</td>
                                        <td className="px-4 py-3 text-gray-600">{contact.phone}</td>
                                        <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{contact.email || '-'}</td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {contact.tags && contact.tags.length > 0 ? (
                                                    contact.tags.map((tag) => (
                                                        <span key={tag} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-400 text-xs">-</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {contact.opted_out ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-medium">Opted Out</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={() => handleDelete(contact.id)}
                                                className="text-red-500 hover:text-red-700 transition p-1"
                                                title="Delete contact"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {contacts.last_page > 1 && (
                    <div className="px-4 py-3 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-sm text-gray-500">
                            Showing {(contacts.current_page - 1) * contacts.per_page + 1} to{' '}
                            {Math.min(contacts.current_page * contacts.per_page, contacts.total)} of {contacts.total} contacts
                        </p>
                        <div className="flex gap-1">
                            {contacts.links.map((link, i) => (
                                <Link
                                    key={i}
                                    href={link.url || '#'}
                                    preserveState
                                    preserveScroll
                                    className={`px-3 py-1 rounded text-sm ${
                                        link.active
                                            ? 'bg-[#075E54] text-white'
                                            : link.url
                                              ? 'bg-white border text-gray-600 hover:bg-gray-50'
                                              : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Slide-out Panel */}
            {showDetailPanel && selectedContact && (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetailPanel(false)} />
                    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-800">Contact Details</h3>
                                <button onClick={() => setShowDetailPanel(false)} className="text-gray-400 hover:text-gray-600">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-[#075E54] rounded-full flex items-center justify-center text-white font-bold text-2xl">
                                    {(selectedContact.name || selectedContact.phone).charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-800 text-lg">{selectedContact.name || 'Unknown'}</h4>
                                    <p className="text-sm text-gray-500">{selectedContact.phone}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Details</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Email</span>
                                            <span className="text-gray-800">{selectedContact.email || '-'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Status</span>
                                            <span>{selectedContact.opted_out ? (
                                                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs">Opted Out</span>
                                            ) : (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs">Active</span>
                                            )}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Created</span>
                                            <span className="text-gray-800">{selectedContact.created_at}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedContact.tags && selectedContact.tags.length > 0 && (
                                    <div className="border-t pt-4">
                                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {selectedContact.tags.map((tag) => (
                                                <span key={tag} className="bg-[#075E54] text-white px-2.5 py-1 rounded-full text-xs">
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="border-t pt-4">
                                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Quick Actions</p>
                                    <div className="flex gap-2">
                                        <Link
                                            href={route('messages.index', { to: selectedContact.phone })}
                                            className="flex-1 text-center bg-[#25D366] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                                        >
                                            Send Message
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(selectedContact.id)}
                                            className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-100 transition border border-red-200"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Contact Modal */}
            <Modal show={showAddModal} onClose={() => setShowAddModal(false)} maxWidth="md">
                <form onSubmit={handleAddContact} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Contact</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                type="text"
                                value={addForm.data.name}
                                onChange={(e) => addForm.setData('name', e.target.value)}
                                placeholder="Contact name"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {addForm.errors.name && <p className="text-sm text-red-600 mt-1">{addForm.errors.name}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="text"
                                value={addForm.data.phone}
                                onChange={(e) => addForm.setData('phone', e.target.value)}
                                placeholder="919876543210"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {addForm.errors.phone && <p className="text-sm text-red-600 mt-1">{addForm.errors.phone}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                value={addForm.data.email}
                                onChange={(e) => addForm.setData('email', e.target.value)}
                                placeholder="contact@example.com"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {addForm.errors.email && <p className="text-sm text-red-600 mt-1">{addForm.errors.email}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                            <input
                                type="text"
                                value={addForm.data.tags}
                                onChange={(e) => addForm.setData('tags', e.target.value)}
                                placeholder="customer, vip (comma separated)"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            <p className="text-xs text-gray-400 mt-1">Separate tags with commas</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowAddModal(false); addForm.reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={addForm.processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                            {addForm.processing ? 'Adding...' : 'Add Contact'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Import CSV Modal */}
            <Modal show={showImportModal} onClose={() => { setShowImportModal(false); setImportPreview(null); }} maxWidth="xl">
                <form onSubmit={handleImport} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Import Contacts from CSV</h3>

                    {!importPreview ? (
                        <div
                            onClick={() => csvInputRef.current?.click()}
                            className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-gray-400 transition"
                        >
                            <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p className="text-sm text-gray-500">Click to select a CSV file</p>
                            <p className="text-xs text-gray-400 mt-1">File should have headers: name, phone, email, tags</p>
                            <input ref={csvInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvChange} />
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-600 mb-3">Preview (first 5 rows). Map columns below:</p>
                            <div className="overflow-x-auto border rounded-lg mb-4">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {importPreview[0]?.map((_, i) => (
                                                <th key={i} className="px-3 py-2">
                                                    <select
                                                        value={columnMapping[i] || 'skip'}
                                                        onChange={(e) => setColumnMapping({ ...columnMapping, [i]: e.target.value })}
                                                        className="w-full text-xs rounded border-gray-300 focus:border-[#25D366] focus:ring-[#25D366]"
                                                    >
                                                        <option value="skip">Skip</option>
                                                        <option value="name">Name</option>
                                                        <option value="phone">Phone</option>
                                                        <option value="email">Email</option>
                                                        <option value="tags">Tags</option>
                                                    </select>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {importPreview.map((row, ri) => (
                                            <tr key={ri} className={ri === 0 ? 'bg-yellow-50 font-medium' : ''}>
                                                {row.map((cell, ci) => (
                                                    <td key={ci} className="px-3 py-1.5 text-gray-600 truncate max-w-[150px]">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => { setShowImportModal(false); setImportPreview(null); importForm.reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        {importPreview && (
                            <button type="submit" disabled={importForm.processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                                {importForm.processing ? 'Importing...' : 'Import Contacts'}
                            </button>
                        )}
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
