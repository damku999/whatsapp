import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

interface Props {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
}

const endpoints = [
    { method: 'POST', path: '/api/v1/messages/send', description: 'Send a message (text, image, video, document)' },
    { method: 'GET', path: '/api/v1/sessions', description: 'List all sessions' },
    { method: 'POST', path: '/api/v1/sessions', description: 'Create a new session' },
    { method: 'GET', path: '/api/v1/contacts', description: 'List contacts' },
    { method: 'POST', path: '/api/v1/contacts', description: 'Create a contact' },
    { method: 'GET', path: '/api/v1/groups', description: 'List contact groups' },
    { method: 'POST', path: '/api/v1/campaigns', description: 'Create a campaign' },
    { method: 'GET', path: '/api/v1/messages', description: 'List message history' },
    { method: 'POST', path: '/api/v1/webhooks', description: 'Register a webhook' },
];

const methodColors: Record<string, string> = {
    GET: 'bg-blue-100 text-blue-700',
    POST: 'bg-green-100 text-green-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    DELETE: 'bg-red-100 text-red-700',
};

export default function ApiKeysIndex({ apiKey, apiSecret, baseUrl }: Props) {
    const [showKey, setShowKey] = useState(false);
    const [showSecret, setShowSecret] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'curl' | 'php' | 'nodejs'>('curl');
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    function maskValue(value: string) {
        if (!value) return '---';
        return value.substring(0, 8) + '...' + value.substring(value.length - 4);
    }

    function copyToClipboard(text: string, label: string) {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(label);
            setTimeout(() => setCopied(null), 2000);
        });
    }

    function handleRegenerate() {
        if (!confirm('Are you sure you want to regenerate your API key? The old key will stop working immediately.')) return;
        router.post(route('api-keys.regenerate'), {}, {
            onSuccess: () => {
                setAlert({ type: 'success', message: 'API key regenerated successfully.' });
                setTimeout(() => setAlert(null), 4000);
            },
            onError: () => {
                setAlert({ type: 'error', message: 'Failed to regenerate API key.' });
                setTimeout(() => setAlert(null), 4000);
            },
        });
    }

    const curlExample = `curl -X POST "${baseUrl}/api/v1/messages/send" \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "session_id": 1,
    "to": "919876543210",
    "type": "text",
    "message": "Hello from WhatsApp Monks API!"
  }'`;

    const phpExample = `<?php
$ch = curl_init();
curl_setopt_array($ch, [
    CURLOPT_URL => '${baseUrl}/api/v1/messages/send',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ${apiKey}',
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'session_id' => 1,
        'to' => '919876543210',
        'type' => 'text',
        'message' => 'Hello from WhatsApp Monks API!',
    ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`;

    const nodeExample = `const response = await fetch('${baseUrl}/api/v1/messages/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    session_id: 1,
    to: '919876543210',
    type: 'text',
    message: 'Hello from WhatsApp Monks API!',
  }),
});
const data = await response.json();
console.log(data);`;

    const codeExamples: Record<string, string> = {
        curl: curlExample,
        php: phpExample,
        nodejs: nodeExample,
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">API Keys</h2>}>
            <Head title="API Keys" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            <div className="space-y-6">
                {/* API Credentials */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-semibold text-gray-800 mb-4">API Credentials</h3>
                    <p className="text-sm text-gray-500 mb-6">
                        Use these credentials to authenticate your API requests. Keep them safe and never share publicly.
                    </p>

                    <div className="space-y-4">
                        {/* API Key */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="sm:w-24 shrink-0">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">API Key</span>
                            </div>
                            <div className="flex-1">
                                <code className="text-sm text-gray-800 font-mono break-all">
                                    {showKey ? apiKey : maskValue(apiKey)}
                                </code>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setShowKey(!showKey)}
                                    className="text-gray-500 hover:text-gray-700 p-1.5 border rounded-lg text-xs"
                                >
                                    {showKey ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(apiKey, 'key')}
                                    className={`p-1.5 border rounded-lg text-xs transition ${copied === 'key' ? 'bg-green-50 text-green-600 border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {copied === 'key' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* API Secret */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <div className="sm:w-24 shrink-0">
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">API Secret</span>
                            </div>
                            <div className="flex-1">
                                <code className="text-sm text-gray-800 font-mono break-all">
                                    {showSecret ? apiSecret : maskValue(apiSecret)}
                                </code>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setShowSecret(!showSecret)}
                                    className="text-gray-500 hover:text-gray-700 p-1.5 border rounded-lg text-xs"
                                >
                                    {showSecret ? 'Hide' : 'Show'}
                                </button>
                                <button
                                    onClick={() => copyToClipboard(apiSecret, 'secret')}
                                    className={`p-1.5 border rounded-lg text-xs transition ${copied === 'secret' ? 'bg-green-50 text-green-600 border-green-200' : 'text-gray-500 hover:text-gray-700'}`}
                                >
                                    {copied === 'secret' ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                        <button
                            onClick={handleRegenerate}
                            className="inline-flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-100 transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Regenerate Key
                        </button>
                        <p className="text-xs text-gray-400">This will invalidate the current key immediately.</p>
                    </div>
                </div>

                {/* API Endpoints */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b">
                        <h3 className="font-semibold text-gray-800">API Endpoints</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Endpoint</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {endpoints.map((ep, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded ${methodColors[ep.method]}`}>
                                                {ep.method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <code className="text-xs font-mono text-[#075E54]">{ep.path}</code>
                                        </td>
                                        <td className="px-6 py-3 text-gray-600">{ep.description}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Code Examples */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b flex items-center justify-between">
                        <h3 className="font-semibold text-gray-800">Code Examples</h3>
                        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
                            {[
                                { key: 'curl', label: 'cURL' },
                                { key: 'php', label: 'PHP' },
                                { key: 'nodejs', label: 'Node.js' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as 'curl' | 'php' | 'nodejs')}
                                    className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                                        activeTab === tab.key ? 'bg-white text-[#075E54] shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 relative">
                        <button
                            onClick={() => copyToClipboard(codeExamples[activeTab], 'code')}
                            className={`absolute top-6 right-6 px-2.5 py-1 rounded text-xs font-medium border transition ${
                                copied === 'code' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            {copied === 'code' ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto text-xs leading-relaxed">
                            <code>{codeExamples[activeTab]}</code>
                        </pre>
                    </div>
                </div>

                {/* Documentation Link */}
                <div className="bg-[#075E54] rounded-xl p-6 text-white">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h3 className="font-semibold text-lg">Full API Documentation</h3>
                            <p className="text-green-200 text-sm mt-1">
                                Explore detailed API documentation with Swagger UI for all available endpoints.
                            </p>
                        </div>
                        <a
                            href={`${baseUrl}/api/documentation`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition shrink-0"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            Open Swagger Docs
                        </a>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
