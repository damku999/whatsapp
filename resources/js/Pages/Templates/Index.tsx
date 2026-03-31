import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router, Link } from '@inertiajs/react';
import { useState, useRef } from 'react';

interface Template {
    id: number;
    name: string;
    message_type: 'text' | 'image' | 'video' | 'document';
    body: string;
    media_url: string | null;
    created_at: string;
}

interface Props {
    templates: { data: Template[] } | Template[];
}

const messageTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'image', label: 'Image' },
    { value: 'video', label: 'Video' },
    { value: 'document', label: 'Document' },
];

const variables = ['{{name}}', '{{phone}}', '{{custom}}'];

export default function TemplatesIndex({ templates: rawTemplates }: Props) {
    const templates = Array.isArray(rawTemplates) ? rawTemplates : (rawTemplates?.data ?? []);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<{
        name: string;
        message_type: string;
        body: string;
        media: File | null;
    }>({
        name: '',
        message_type: 'text',
        body: '',
        media: null,
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function openCreate() {
        reset();
        setEditingTemplate(null);
        setShowModal(true);
    }

    function openEdit(template: Template) {
        setEditingTemplate(template);
        setData({
            name: template.name,
            message_type: template.message_type,
            body: template.body,
            media: null,
        });
        setShowModal(true);
    }

    function handleSave(e: React.FormEvent) {
        e.preventDefault();
        const options = {
            forceFormData: true,
            onSuccess: () => {
                setShowModal(false);
                setEditingTemplate(null);
                reset();
                showAlertMessage('success', editingTemplate ? 'Template updated.' : 'Template created.');
            },
            onError: () => showAlertMessage('error', 'Failed to save template.'),
        };

        if (editingTemplate) {
            router.post(route('templates.update', editingTemplate.id), {
                ...data,
                _method: 'PUT',
            }, options);
        } else {
            post(route('templates.store'), options);
        }
    }

    function handleDelete(id: number) {
        if (!confirm('Delete this template?')) return;
        router.delete(route('templates.destroy', id), {
            onSuccess: () => showAlertMessage('success', 'Template deleted.'),
        });
    }

    function insertVariable(variable: string) {
        const textarea = textAreaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newBody = data.body.substring(0, start) + variable + data.body.substring(end);
        setData('body', newBody);
        setTimeout(() => {
            textarea.focus();
            const newPos = start + variable.length;
            textarea.setSelectionRange(newPos, newPos);
        }, 0);
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Templates</h2>}>
            <Head title="Templates" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <p className="text-gray-500 text-sm">Save reusable message templates for quick sending.</p>
                <button
                    onClick={openCreate}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Template
                </button>
            </div>

            {templates.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No templates yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Create message templates for quick reuse.</p>
                    <button onClick={openCreate} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                        Create Template
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <div key={template.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div>
                                    <h3 className="font-semibold text-gray-800">{template.name}</h3>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600 capitalize">
                                        {template.message_type}
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => openEdit(template)} className="text-gray-400 hover:text-[#075E54] p-1" title="Edit">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {template.media_url && (
                                <div className="mb-3 bg-gray-50 rounded-lg p-2">
                                    {template.message_type === 'image' ? (
                                        <img src={template.media_url} alt="" className="w-full h-32 object-cover rounded" />
                                    ) : (
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Media attached
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{template.body}</p>
                            </div>

                            <div className="flex gap-2">
                                <Link
                                    href={route('messages.index', { template: template.id })}
                                    className="flex-1 text-center bg-[#25D366] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#128C7E] transition"
                                >
                                    Use Template
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={showModal} onClose={() => { setShowModal(false); setEditingTemplate(null); }} maxWidth="lg">
                <form onSubmit={handleSave} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        {editingTemplate ? 'Edit Template' : 'Create Template'}
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., Welcome Message"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
                            <div className="flex gap-2">
                                {messageTypeOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => setData('message_type', opt.value)}
                                        className={`px-4 py-2 rounded-lg text-xs font-medium border transition ${
                                            data.message_type === opt.value
                                                ? 'border-[#25D366] bg-green-50 text-[#075E54]'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700">Body</label>
                                <div className="flex gap-1">
                                    {variables.map((v) => (
                                        <button
                                            key={v}
                                            type="button"
                                            onClick={() => insertVariable(v)}
                                            className="px-2 py-0.5 text-xs bg-[#075E54] text-white rounded hover:bg-[#128C7E] transition"
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                ref={textAreaRef}
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={6}
                                placeholder="Type your template message here. Use variables for personalization."
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                            />
                            {errors.body && <p className="text-sm text-red-600 mt-1">{errors.body}</p>}
                        </div>

                        {data.message_type !== 'text' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Media File</label>
                                <input
                                    type="file"
                                    onChange={(e) => setData('media', e.target.files?.[0] || null)}
                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-[#075E54] hover:file:bg-green-100"
                                    accept={
                                        data.message_type === 'image' ? 'image/*' :
                                        data.message_type === 'video' ? 'video/*' :
                                        '*'
                                    }
                                />
                                {editingTemplate?.media_url && !data.media && (
                                    <p className="text-xs text-gray-400 mt-1">Current media file will be kept if no new file is uploaded.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={() => { setShowModal(false); setEditingTemplate(null); reset(); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                            Cancel
                        </button>
                        <button type="submit" disabled={processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                            {processing ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
