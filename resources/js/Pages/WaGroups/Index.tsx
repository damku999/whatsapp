import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface WaGroup { id: string; name: string; members_count: number; is_admin: boolean; }
interface Session { id: number; session_name: string; phone_number: string; status: string; }
interface Props { groups: WaGroup[]; sessions: Session[]; }

export default function WaGroups({ groups, sessions }: Props) {
    const [selectedSession, setSelectedSession] = useState(sessions?.[0]?.id || '');
    const [showSend, setShowSend] = useState<string | null>(null);

    const sendForm = useForm({ session_id: '', group_id: '', message: '', type: 'text' });
    const createForm = useForm({ session_id: '', name: '', participants: '' });

    const loadGroups = (sessionId: string) => {
        setSelectedSession(Number(sessionId));
        router.get(route('wa-groups.index'), { session_id: sessionId }, { preserveState: true });
    };

    const sendToGroup = (groupId: string) => {
        sendForm.setData('group_id', groupId);
        sendForm.setData('session_id', String(selectedSession));
        setShowSend(groupId);
    };

    const submitSend = () => {
        sendForm.post(route('wa-groups.send'), { onSuccess: () => setShowSend(null) });
    };

    const extractMembers = (groupId: string) => {
        router.post(route('wa-groups.extract-members'), { session_id: selectedSession, group_id: groupId });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">WhatsApp Groups</h2>}>
            <Head title="WhatsApp Groups" />

            <div className="flex items-center gap-4 mb-6">
                <select value={selectedSession} onChange={e => loadGroups(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
                    <option value="">Select Session</option>
                    {sessions?.filter(s => s.status === 'active').map(s => (
                        <option key={s.id} value={s.id}>{s.session_name} ({s.phone_number})</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups?.map(group => (
                    <div key={group.id} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <h4 className="font-semibold text-gray-800">{group.name}</h4>
                                <p className="text-sm text-gray-500">{group.members_count} members</p>
                            </div>
                            {group.is_admin && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Admin</span>}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => sendToGroup(group.id)} className="flex-1 bg-[#25D366] text-white py-1.5 rounded-lg text-xs hover:bg-[#128C7E]">Send Message</button>
                            <button onClick={() => extractMembers(group.id)} className="flex-1 border py-1.5 rounded-lg text-xs hover:bg-gray-50">Extract Members</button>
                        </div>
                    </div>
                )) ?? <div className="col-span-3 text-center py-12 text-gray-400">Select a session to view WhatsApp groups</div>}
            </div>

            {/* Send Modal */}
            {showSend && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="font-semibold text-lg mb-4">Send to Group</h3>
                        <textarea rows={4} value={sendForm.data.message} onChange={e => sendForm.setData('message', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm mb-4" placeholder="Type your message..." />
                        <div className="flex gap-3">
                            <button onClick={submitSend} disabled={sendForm.processing} className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-sm hover:bg-[#128C7E] disabled:opacity-50">Send</button>
                            <button onClick={() => setShowSend(null)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
