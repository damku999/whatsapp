import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface Ticket { id: number; subject: string; status: string; priority: string; created_at: string; replies_count?: number; }
interface Props { tickets: Ticket[]; }

export default function Support({ tickets }: Props) {
    const [showNew, setShowNew] = useState(false);
    const form = useForm({ subject: '', message: '', priority: 'medium' });

    const submit = () => {
        form.post(route('support.store'), { onSuccess: () => { setShowNew(false); form.reset(); } });
    };

    const statusColors: Record<string, string> = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', resolved: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-700' };
    const priorityColors: Record<string, string> = { low: 'text-gray-500', medium: 'text-yellow-600', high: 'text-red-600' };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Support</h2>}>
            <Head title="Support" />

            <div className="flex justify-end mb-4">
                <button onClick={() => setShowNew(true)} className="bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#128C7E]">New Ticket</button>
            </div>

            {showNew && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-6">
                    <h3 className="font-semibold mb-4">Create Support Ticket</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Subject</label>
                            <input type="text" value={form.data.subject} onChange={e => form.setData('subject', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Priority</label>
                            <select value={form.data.priority} onChange={e => form.setData('priority', e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Message</label>
                            <textarea rows={4} value={form.data.message} onChange={e => form.setData('message', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={submit} disabled={form.processing} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm hover:bg-[#128C7E] disabled:opacity-50">Submit</button>
                            <button onClick={() => setShowNew(false)} className="border px-6 py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {tickets?.length > 0 ? tickets.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-3 text-sm">#{t.id}</td>
                                    <td className="px-6 py-3 text-sm font-medium">{t.subject}</td>
                                    <td className={`px-6 py-3 text-sm font-medium ${priorityColors[t.priority] || ''}`}>{t.priority}</td>
                                    <td className="px-6 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[t.status] || 'bg-gray-100'}`}>{t.status.replace('_', ' ')}</span></td>
                                    <td className="px-6 py-3 text-sm text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-3"><a href={route('support.show', t.id)} className="text-sm text-[#128C7E] hover:underline">View</a></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 text-sm">No tickets yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
