import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useRef, useCallback } from 'react';

interface Session {
    id: number;
    name: string;
    status: string;
}

interface SentMessage {
    id: number;
    to_number: string;
    message_type: string;
    content: string | null;
    status: string;
    created_at: string;
}

interface Props {
    sessions: Session[];
    recentMessages: SentMessage[];
    prefill?: {
        message_type?: string;
        body?: string;
        media_url?: string;
    };
}

const messageTypes = [
    { value: 'text', label: 'Text', icon: 'M4 6h16M4 12h16M4 18h7' },
    { value: 'image', label: 'Image', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { value: 'video', label: 'Video', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
    { value: 'document', label: 'Document', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { value: 'audio', label: 'Audio', icon: 'M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3' },
    { value: 'location', label: 'Location', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
    { value: 'contact', label: 'Contact', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

const statusBadge: Record<string, string> = {
    sent: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    read: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700',
};

export default function MessagesIndex({ sessions, recentMessages, prefill }: Props) {
    const [preview, setPreview] = useState<string | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, reset } = useForm<{
        session_id: string;
        to_number: string;
        message_type: string;
        content: string;
        media: File | null;
        latitude: string;
        longitude: string;
        contact_name: string;
        contact_phone: string;
    }>({
        session_id: '',
        to_number: '',
        message_type: prefill?.message_type || 'text',
        content: prefill?.body || '',
        media: null,
        latitude: '',
        longitude: '',
        contact_name: '',
        contact_phone: '',
    });

    const showAlert = useCallback((type: 'success' | 'error', message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }, []);

    function handleFileChange(file: File | null) {
        if (!file) return;
        setData('media', file);
        if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
            const reader = new FileReader();
            reader.onload = (e) => setPreview(e.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        setDragActive(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFileChange(file);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post(route('messages.send'), {
            forceFormData: true,
            onSuccess: () => {
                reset();
                setPreview(null);
                showAlert('success', 'Message sent successfully!');
            },
            onError: () => {
                showAlert('error', 'Failed to send message. Please check your inputs.');
            },
        });
    }

    const needsMedia = ['image', 'video', 'document', 'audio'].includes(data.message_type);
    const isLocation = data.message_type === 'location';
    const isContact = data.message_type === 'contact';

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Send Message</h2>}>
            <Head title="Send Message" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                <select
                                    value={data.session_id}
                                    onChange={(e) => setData('session_id', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                >
                                    <option value="">Select a session</option>
                                    {sessions.map((s) => (
                                        <option key={s.id} value={s.id} disabled={s.status !== 'active'}>
                                            {s.name} {s.status !== 'active' ? `(${s.status})` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.session_id && <p className="text-sm text-red-600 mt-1">{errors.session_id}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <input
                                    type="text"
                                    value={data.to_number}
                                    onChange={(e) => setData('to_number', e.target.value)}
                                    placeholder="e.g., 919876543210"
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                />
                                {errors.to_number && <p className="text-sm text-red-600 mt-1">{errors.to_number}</p>}
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Message Type</label>
                            <div className="flex flex-wrap gap-2">
                                {messageTypes.map((type) => (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => {
                                            setData('message_type', type.value);
                                            setPreview(null);
                                        }}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                                            data.message_type === type.value
                                                ? 'border-[#25D366] bg-green-50 text-[#075E54]'
                                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                        }`}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                                        </svg>
                                        {type.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {(data.message_type === 'text' || needsMedia) && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {needsMedia ? 'Caption (optional)' : 'Message'}
                                </label>
                                <textarea
                                    value={data.content}
                                    onChange={(e) => setData('content', e.target.value)}
                                    rows={4}
                                    placeholder="Type your message here..."
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                                />
                                {errors.content && <p className="text-sm text-red-600 mt-1">{errors.content}</p>}
                            </div>
                        )}

                        {needsMedia && (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                                    onDragLeave={() => setDragActive(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                                        dragActive ? 'border-[#25D366] bg-green-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                >
                                    {data.media ? (
                                        <div className="flex items-center justify-center gap-3">
                                            <svg className="w-8 h-8 text-[#25D366]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            <div className="text-left">
                                                <p className="text-sm font-medium text-gray-700">{data.media.name}</p>
                                                <p className="text-xs text-gray-500">{(data.media.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div>
                                            <svg className="w-10 h-10 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                            </svg>
                                            <p className="text-sm text-gray-500">Drag and drop a file here, or click to browse</p>
                                        </div>
                                    )}
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                                        accept={
                                            data.message_type === 'image' ? 'image/*' :
                                            data.message_type === 'video' ? 'video/*' :
                                            data.message_type === 'audio' ? 'audio/*' :
                                            '*'
                                        }
                                    />
                                </div>
                                {errors.media && <p className="text-sm text-red-600 mt-1">{errors.media}</p>}
                            </div>
                        )}

                        {isLocation && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                                    <input
                                        type="text"
                                        value={data.latitude}
                                        onChange={(e) => setData('latitude', e.target.value)}
                                        placeholder="e.g., 28.6139"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    />
                                    {errors.latitude && <p className="text-sm text-red-600 mt-1">{errors.latitude}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                                    <input
                                        type="text"
                                        value={data.longitude}
                                        onChange={(e) => setData('longitude', e.target.value)}
                                        placeholder="e.g., 77.2090"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    />
                                    {errors.longitude && <p className="text-sm text-red-600 mt-1">{errors.longitude}</p>}
                                </div>
                            </div>
                        )}

                        {isContact && (
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                                    <input
                                        type="text"
                                        value={data.contact_name}
                                        onChange={(e) => setData('contact_name', e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    />
                                    {errors.contact_name && <p className="text-sm text-red-600 mt-1">{errors.contact_name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                                    <input
                                        type="text"
                                        value={data.contact_phone}
                                        onChange={(e) => setData('contact_phone', e.target.value)}
                                        placeholder="919876543210"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    />
                                    {errors.contact_phone && <p className="text-sm text-red-600 mt-1">{errors.contact_phone}</p>}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={processing}
                            className="w-full bg-[#25D366] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {processing ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Send Message
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div>
                    {preview && (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                            {data.message_type === 'image' ? (
                                <img src={preview} alt="Preview" className="w-full rounded-lg" />
                            ) : data.message_type === 'video' ? (
                                <video src={preview} controls className="w-full rounded-lg" />
                            ) : null}
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                        <div className="px-4 py-3 border-b">
                            <h3 className="text-sm font-medium text-gray-700">Quick Tips</h3>
                        </div>
                        <div className="p-4 space-y-2 text-xs text-gray-500">
                            <p>-- Phone number should include country code without "+" (e.g., 919876543210)</p>
                            <p>-- Session must be in "Active" status to send messages</p>
                            <p>-- Image max size: 16MB, Video max size: 64MB</p>
                            <p>-- Supported formats: JPEG, PNG, MP4, PDF, DOC, OGG</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b">
                    <h3 className="font-semibold text-gray-800">Recent Sent Messages</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">To</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentMessages && recentMessages.length > 0 ? (
                                recentMessages.map((msg) => (
                                    <tr key={msg.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 whitespace-nowrap font-medium text-gray-800">{msg.to_number}</td>
                                        <td className="px-6 py-3 whitespace-nowrap capitalize text-gray-600">{msg.message_type}</td>
                                        <td className="px-6 py-3 text-gray-600 max-w-xs truncate">{msg.content || `[${msg.message_type}]`}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge[msg.status] || 'bg-gray-100 text-gray-600'}`}>
                                                {msg.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-gray-500">{msg.created_at}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No messages sent yet. Send your first message above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
