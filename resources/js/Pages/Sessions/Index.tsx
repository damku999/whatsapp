import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState, useEffect, useCallback } from 'react';

interface Session {
    id: number;
    name: string;
    phone_number: string | null;
    profile_name: string | null;
    status: 'active' | 'disconnected' | 'pending' | 'scanning';
    auth_type: 'qr' | 'pairing_code';
    last_active_at: string | null;
    qr_code: string | null;
    pairing_code: string | null;
}

interface Props {
    sessions: Session[];
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
    disconnected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Disconnected' },
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    scanning: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Scanning' },
};

export default function SessionsIndex({ sessions }: Props) {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [scanningSessionId, setScanningSessionId] = useState<number | null>(null);
    const [qrData, setQrData] = useState<string | null>(null);
    const [pairingCode, setPairingCode] = useState<string | null>(null);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        auth_type: 'qr' as 'qr' | 'pairing_code',
    });

    const clearAlert = useCallback(() => {
        const timer = setTimeout(() => setAlert(null), 4000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (alert) {
            const cleanup = clearAlert();
            return cleanup;
        }
    }, [alert, clearAlert]);

    useEffect(() => {
        if (!scanningSessionId) return;

        const interval = setInterval(() => {
            router.reload({
                only: ['sessions'],
                onSuccess: (page) => {
                    const updated = (page.props as unknown as Props).sessions.find(
                        (s) => s.id === scanningSessionId
                    );
                    if (updated) {
                        if (updated.status === 'active') {
                            setScanningSessionId(null);
                            setQrData(null);
                            setPairingCode(null);
                            setAlert({ type: 'success', message: 'Session connected successfully!' });
                        } else if (updated.qr_code) {
                            setQrData(updated.qr_code);
                        } else if (updated.pairing_code) {
                            setPairingCode(updated.pairing_code);
                        }
                    }
                },
            });
        }, 3000);

        return () => clearInterval(interval);
    }, [scanningSessionId]);

    function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        post(route('sessions.store'), {
            onSuccess: () => {
                reset();
                setShowCreateModal(false);
                setAlert({ type: 'success', message: 'Session created! Starting connection...' });
            },
            onError: () => {
                setAlert({ type: 'error', message: 'Failed to create session.' });
            },
        });
    }

    function handleDisconnect(id: number) {
        if (!confirm('Are you sure you want to disconnect this session?')) return;
        router.post(route('sessions.disconnect', id), {}, {
            onSuccess: () => setAlert({ type: 'success', message: 'Session disconnected.' }),
            onError: () => setAlert({ type: 'error', message: 'Failed to disconnect session.' }),
        });
    }

    function handleDelete(id: number) {
        if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) return;
        router.delete(route('sessions.destroy', id), {
            onSuccess: () => setAlert({ type: 'success', message: 'Session deleted.' }),
            onError: () => setAlert({ type: 'error', message: 'Failed to delete session.' }),
        });
    }

    function handleStartScan(session: Session) {
        setScanningSessionId(session.id);
        if (session.qr_code) setQrData(session.qr_code);
        if (session.pairing_code) setPairingCode(session.pairing_code);
        router.post(route('sessions.start', session.id), {}, {
            onError: () => {
                setScanningSessionId(null);
                setAlert({ type: 'error', message: 'Failed to start session scanning.' });
            },
        });
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Sessions</h2>}>
            <Head title="Sessions" />

            {alert && (
                <div
                    className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                        alert.type === 'success'
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                >
                    {alert.message}
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <p className="text-gray-500 text-sm">
                    Manage your WhatsApp sessions. Each session connects to one WhatsApp account.
                </p>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition shrink-0"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Session
                </button>
            </div>

            {sessions.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-800 mb-2">No sessions yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Create your first session to start connecting WhatsApp.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                    >
                        Add Session
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map((session) => {
                        const status = statusConfig[session.status] || statusConfig.pending;
                        return (
                            <div key={session.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {session.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{session.name}</h3>
                                            <p className="text-xs text-gray-500">
                                                {session.phone_number || 'No phone linked'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${status.bg} ${status.text}`}>
                                        {status.label}
                                    </span>
                                </div>

                                <div className="space-y-1 text-sm text-gray-600 mb-4">
                                    {session.profile_name && (
                                        <p>
                                            <span className="text-gray-400">Profile:</span> {session.profile_name}
                                        </p>
                                    )}
                                    <p>
                                        <span className="text-gray-400">Auth:</span>{' '}
                                        {session.auth_type === 'qr' ? 'QR Code' : 'Pairing Code'}
                                    </p>
                                    {session.last_active_at && (
                                        <p>
                                            <span className="text-gray-400">Last active:</span> {session.last_active_at}
                                        </p>
                                    )}
                                </div>

                                {scanningSessionId === session.id && (
                                    <div className="mb-4 p-4 bg-gray-50 rounded-lg text-center">
                                        {session.auth_type === 'qr' && qrData ? (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Scan this QR code with WhatsApp</p>
                                                <img
                                                    src={qrData.startsWith('data:') ? qrData : `data:image/png;base64,${qrData}`}
                                                    alt="QR Code"
                                                    className="w-48 h-48 mx-auto border rounded"
                                                />
                                                <p className="text-xs text-gray-400 mt-2 animate-pulse">Auto-refreshing...</p>
                                            </div>
                                        ) : session.auth_type === 'pairing_code' && pairingCode ? (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Enter this code in WhatsApp</p>
                                                <p className="text-2xl font-mono font-bold tracking-widest text-[#075E54]">
                                                    {pairingCode}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2 animate-pulse">Waiting for connection...</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2 py-4">
                                                <svg className="w-5 h-5 animate-spin text-[#128C7E]" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                <span className="text-sm text-gray-500">Initializing...</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    {(session.status === 'pending' || session.status === 'disconnected') && (
                                        <button
                                            onClick={() => handleStartScan(session)}
                                            disabled={scanningSessionId === session.id}
                                            className="flex-1 bg-[#25D366] text-white text-xs font-medium py-2 rounded-lg hover:bg-[#128C7E] transition disabled:opacity-50"
                                        >
                                            {scanningSessionId === session.id ? 'Connecting...' : 'Connect'}
                                        </button>
                                    )}
                                    {session.status === 'active' && (
                                        <button
                                            onClick={() => handleDisconnect(session.id)}
                                            className="flex-1 bg-yellow-50 text-yellow-700 text-xs font-medium py-2 rounded-lg hover:bg-yellow-100 transition border border-yellow-200"
                                        >
                                            Disconnect
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(session.id)}
                                        className="bg-red-50 text-red-600 text-xs font-medium py-2 px-3 rounded-lg hover:bg-red-100 transition border border-red-200"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal show={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth="md">
                <form onSubmit={handleCreate} className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New Session</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Session Name</label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g., My Business WhatsApp"
                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                            />
                            {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Authentication Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setData('auth_type', 'qr')}
                                    className={`p-3 rounded-lg border-2 text-center transition ${
                                        data.auth_type === 'qr'
                                            ? 'border-[#25D366] bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <svg className="w-8 h-8 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">QR Code</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setData('auth_type', 'pairing_code')}
                                    className={`p-3 rounded-lg border-2 text-center transition ${
                                        data.auth_type === 'pairing_code'
                                            ? 'border-[#25D366] bg-green-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <svg className="w-8 h-8 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                    </svg>
                                    <span className="text-sm font-medium text-gray-700">Pairing Code</span>
                                </button>
                            </div>
                            {errors.auth_type && <p className="text-sm text-red-600 mt-1">{errors.auth_type}</p>}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={() => {
                                setShowCreateModal(false);
                                reset();
                            }}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50"
                        >
                            {processing ? 'Creating...' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
