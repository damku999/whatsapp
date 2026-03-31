import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Modal from '@/Components/Modal';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface Session {
    id: number;
    name: string;
}

interface FlowNode {
    id: number;
    type: 'text_reply' | 'image_reply' | 'button_message' | 'list_message' | 'delay' | 'condition' | 'input_capture';
    content: string;
    next_node_id: number | null;
    order: number;
    config: Record<string, any>;
}

interface ChatbotFlow {
    id: number;
    name: string;
    trigger_keyword: string;
    trigger_type: 'exact' | 'contains' | 'starts_with' | 'regex' | 'any';
    is_active: boolean;
    session_id: number;
    session_name: string;
    office_hours_enabled: boolean;
    office_hours_start: string | null;
    office_hours_end: string | null;
    fallback_message: string | null;
    nodes: FlowNode[];
    created_at: string;
}

interface Props {
    flows: ChatbotFlow[];
    sessions: Session[];
}

const nodeTypes = [
    { value: 'text_reply', label: 'Text Reply', icon: 'M4 6h16M4 12h16M4 18h7', color: 'bg-blue-100 text-blue-700' },
    { value: 'image_reply', label: 'Image Reply', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', color: 'bg-purple-100 text-purple-700' },
    { value: 'button_message', label: 'Button Message', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z', color: 'bg-green-100 text-green-700' },
    { value: 'list_message', label: 'List Message', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', color: 'bg-orange-100 text-orange-700' },
    { value: 'delay', label: 'Delay', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'condition', label: 'Condition', icon: 'M8 9l4-4 4 4m0 6l-4 4-4-4', color: 'bg-red-100 text-red-700' },
    { value: 'input_capture', label: 'Input Capture', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', color: 'bg-indigo-100 text-indigo-700' },
];

const triggerTypes = [
    { value: 'exact', label: 'Exact Match' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'regex', label: 'Regex' },
    { value: 'any', label: 'Any Message' },
];

export default function ChatbotIndex({ flows: rawFlows, sessions: rawSessions }: Props) {
    const flows = Array.isArray(rawFlows) ? rawFlows : (rawFlows as any)?.data ?? [];
    const sessions = Array.isArray(rawSessions) ? rawSessions : (rawSessions as any)?.data ?? [];

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFlow, setEditingFlow] = useState<ChatbotFlow | null>(null);
    const [showNodeModal, setShowNodeModal] = useState(false);
    const [editingNodeIndex, setEditingNodeIndex] = useState<number | null>(null);
    const [flowNodes, setFlowNodes] = useState<Omit<FlowNode, 'id'>[]>([]);
    const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm({
        name: '',
        trigger_keyword: '',
        trigger_type: 'exact' as string,
        session_id: '',
        office_hours_enabled: false,
        office_hours_start: '09:00',
        office_hours_end: '18:00',
        fallback_message: '',
    });

    const nodeForm = useForm({
        type: 'text_reply' as string,
        content: '',
        config: '{}',
    });

    function showAlertMessage(type: 'success' | 'error', message: string) {
        setAlert({ type, message });
        setTimeout(() => setAlert(null), 4000);
    }

    function handleToggleActive(flow: ChatbotFlow) {
        router.post(route('chatbot.toggle', flow.id), {}, {
            preserveState: true,
            onSuccess: () => showAlertMessage('success', `Flow ${flow.is_active ? 'deactivated' : 'activated'}.`),
        });
    }

    function openCreate() {
        reset();
        setFlowNodes([]);
        setEditingFlow(null);
        setShowCreateModal(true);
    }

    function openEdit(flow: ChatbotFlow) {
        setEditingFlow(flow);
        setData({
            name: flow.name,
            trigger_keyword: flow.trigger_keyword,
            trigger_type: flow.trigger_type,
            session_id: String(flow.session_id),
            office_hours_enabled: flow.office_hours_enabled,
            office_hours_start: flow.office_hours_start || '09:00',
            office_hours_end: flow.office_hours_end || '18:00',
            fallback_message: flow.fallback_message || '',
        });
        setFlowNodes(
            flow.nodes.map((n) => ({
                type: n.type,
                content: n.content,
                next_node_id: n.next_node_id,
                order: n.order,
                config: n.config,
            }))
        );
        setShowCreateModal(true);
    }

    function handleSaveFlow(e: React.FormEvent) {
        e.preventDefault();
        const payload = {
            ...data,
            nodes: flowNodes.map((n, i) => ({ ...n, order: i })),
        };

        if (editingFlow) {
            router.put(route('chatbot.update', editingFlow.id), payload, {
                onSuccess: () => {
                    setShowCreateModal(false);
                    setEditingFlow(null);
                    showAlertMessage('success', 'Flow updated successfully.');
                },
                onError: () => showAlertMessage('error', 'Failed to update flow.'),
            });
        } else {
            router.post(route('chatbot.store'), payload, {
                onSuccess: () => {
                    setShowCreateModal(false);
                    reset();
                    setFlowNodes([]);
                    showAlertMessage('success', 'Flow created successfully.');
                },
                onError: () => showAlertMessage('error', 'Failed to create flow.'),
            });
        }
    }

    function handleDelete(id: number) {
        if (!confirm('Delete this chatbot flow?')) return;
        router.delete(route('chatbot.destroy', id), {
            onSuccess: () => showAlertMessage('success', 'Flow deleted.'),
        });
    }

    function openAddNode() {
        nodeForm.reset();
        setEditingNodeIndex(null);
        setShowNodeModal(true);
    }

    function openEditNode(index: number) {
        const node = flowNodes[index];
        nodeForm.setData({
            type: node.type,
            content: node.content,
            config: JSON.stringify(node.config),
        });
        setEditingNodeIndex(index);
        setShowNodeModal(true);
    }

    function handleSaveNode(e: React.FormEvent) {
        e.preventDefault();
        let parsedConfig: Record<string, any> = {};
        try {
            parsedConfig = JSON.parse(nodeForm.data.config || '{}');
        } catch {
            parsedConfig = {};
        }

        const newNode: Omit<FlowNode, 'id'> = {
            type: nodeForm.data.type as FlowNode['type'],
            content: nodeForm.data.content,
            next_node_id: null,
            order: editingNodeIndex !== null ? editingNodeIndex : flowNodes.length,
            config: parsedConfig,
        };

        if (editingNodeIndex !== null) {
            const updated = [...flowNodes];
            updated[editingNodeIndex] = newNode;
            setFlowNodes(updated);
        } else {
            setFlowNodes([...flowNodes, newNode]);
        }

        setShowNodeModal(false);
        nodeForm.reset();
    }

    function removeNode(index: number) {
        setFlowNodes(flowNodes.filter((_, i) => i !== index));
    }

    function moveNode(index: number, direction: 'up' | 'down') {
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= flowNodes.length) return;
        const updated = [...flowNodes];
        [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
        setFlowNodes(updated);
    }

    function getNodeType(type: string) {
        return nodeTypes.find((n) => n.value === type) || nodeTypes[0];
    }

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Chatbot</h2>}>
            <Head title="Chatbot" />

            {alert && (
                <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    alert.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                    {alert.message}
                </div>
            )}

            {showCreateModal ? (
                <div>
                    <button
                        onClick={() => { setShowCreateModal(false); setEditingFlow(null); }}
                        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Flows
                    </button>

                    <form onSubmit={handleSaveFlow} className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                {editingFlow ? 'Edit Flow' : 'Create Flow'}
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Flow Name</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        placeholder="e.g., Welcome Flow"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    />
                                    {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
                                    <select
                                        value={data.session_id}
                                        onChange={(e) => setData('session_id', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    >
                                        <option value="">Select session</option>
                                        {sessions.map((s) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Keyword</label>
                                    <input
                                        type="text"
                                        value={data.trigger_keyword}
                                        onChange={(e) => setData('trigger_keyword', e.target.value)}
                                        placeholder="e.g., hello, menu, help"
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                        disabled={data.trigger_type === 'any'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Type</label>
                                    <select
                                        value={data.trigger_type}
                                        onChange={(e) => setData('trigger_type', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    >
                                        {triggerTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="border-t pt-4 mt-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.office_hours_enabled}
                                            onChange={(e) => setData('office_hours_enabled', e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#25D366] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#25D366]"></div>
                                    </label>
                                    <span className="text-sm font-medium text-gray-700">Office Hours Only</span>
                                </div>

                                {data.office_hours_enabled && (
                                    <div className="grid grid-cols-2 gap-4 ml-12">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                                            <input
                                                type="time"
                                                value={data.office_hours_start}
                                                onChange={(e) => setData('office_hours_start', e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">End Time</label>
                                            <input
                                                type="time"
                                                value={data.office_hours_end}
                                                onChange={(e) => setData('office_hours_end', e.target.value)}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Fallback Message</label>
                                <textarea
                                    value={data.fallback_message}
                                    onChange={(e) => setData('fallback_message', e.target.value)}
                                    rows={2}
                                    placeholder="Message to send when outside office hours or no matching keyword..."
                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                                />
                            </div>
                        </div>

                        {/* Flow Nodes */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="font-semibold text-gray-800">Flow Nodes</h4>
                                <button
                                    type="button"
                                    onClick={openAddNode}
                                    className="inline-flex items-center gap-1 bg-[#25D366] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#128C7E] transition"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    Add Node
                                </button>
                            </div>

                            {flowNodes.length === 0 ? (
                                <div className="py-8 text-center text-gray-500 text-sm border-2 border-dashed rounded-lg">
                                    No nodes yet. Add nodes to build your flow.
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {flowNodes.map((node, index) => {
                                        const nt = getNodeType(node.type);
                                        return (
                                            <div key={index} className="flex items-center gap-3 border rounded-lg p-3 hover:bg-gray-50">
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveNode(index, 'up')}
                                                        disabled={index === 0}
                                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveNode(index, 'down')}
                                                        disabled={index === flowNodes.length - 1}
                                                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                    >
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                        </svg>
                                                    </button>
                                                </div>

                                                <span className="text-xs font-mono text-gray-400 w-5">{index + 1}</span>

                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${nt.color} shrink-0`}>
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={nt.icon} />
                                                    </svg>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-700">{nt.label}</p>
                                                    <p className="text-xs text-gray-500 truncate">{node.content || 'No content'}</p>
                                                </div>

                                                {index < flowNodes.length - 1 && (
                                                    <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                    </svg>
                                                )}

                                                <div className="flex gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditNode(index)}
                                                        className="text-gray-400 hover:text-[#075E54] p-1"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeNode(index)}
                                                        className="text-gray-400 hover:text-red-500 p-1"
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
                        </div>

                        <div className="flex justify-end gap-3">
                            <button type="button" onClick={() => { setShowCreateModal(false); setEditingFlow(null); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                Cancel
                            </button>
                            <button type="submit" disabled={processing} className="bg-[#25D366] text-white px-8 py-2.5 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition disabled:opacity-50">
                                {processing ? 'Saving...' : editingFlow ? 'Update Flow' : 'Create Flow'}
                            </button>
                        </div>
                    </form>

                    {/* Node Modal */}
                    <Modal show={showNodeModal} onClose={() => setShowNodeModal(false)} maxWidth="md">
                        <form onSubmit={handleSaveNode} className="p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                {editingNodeIndex !== null ? 'Edit Node' : 'Add Node'}
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
                                    <select
                                        value={nodeForm.data.type}
                                        onChange={(e) => nodeForm.setData('type', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm"
                                    >
                                        {nodeTypes.map((t) => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                                    <textarea
                                        value={nodeForm.data.content}
                                        onChange={(e) => nodeForm.setData('content', e.target.value)}
                                        rows={4}
                                        placeholder={
                                            nodeForm.data.type === 'delay'
                                                ? 'Delay in seconds (e.g., 2)'
                                                : nodeForm.data.type === 'condition'
                                                  ? 'Condition expression...'
                                                  : nodeForm.data.type === 'input_capture'
                                                    ? 'Prompt message for input...'
                                                    : 'Message content...'
                                        }
                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none"
                                    />
                                </div>
                                {['button_message', 'list_message'].includes(nodeForm.data.type) && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Configuration (JSON)</label>
                                        <textarea
                                            value={nodeForm.data.config}
                                            onChange={(e) => nodeForm.setData('config', e.target.value)}
                                            rows={3}
                                            placeholder='{"buttons": ["Option 1", "Option 2"]}'
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-[#25D366] focus:ring-[#25D366] text-sm resize-none font-mono text-xs"
                                        />
                                        <p className="text-xs text-gray-400 mt-1">
                                            {nodeForm.data.type === 'button_message'
                                                ? 'Format: {"buttons": ["Button 1", "Button 2", "Button 3"]}'
                                                : 'Format: {"title": "Menu", "sections": [{"title": "Section", "rows": [{"title": "Row 1"}]}]}'}
                                        </p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowNodeModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                                    Cancel
                                </button>
                                <button type="submit" className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                                    {editingNodeIndex !== null ? 'Update Node' : 'Add Node'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                </div>
            ) : (
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <p className="text-gray-500 text-sm">Build automated reply flows triggered by keywords.</p>
                        <button
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Flow
                        </button>
                    </div>

                    {flows.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <h3 className="text-lg font-medium text-gray-800 mb-2">No chatbot flows yet</h3>
                            <p className="text-gray-500 text-sm mb-4">Create your first automated flow.</p>
                            <button onClick={openCreate} className="bg-[#25D366] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#128C7E] transition">
                                Create Flow
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Session</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {flows.map((flow) => (
                                            <tr key={flow.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-3 font-medium text-gray-800">{flow.name}</td>
                                                <td className="px-6 py-3">
                                                    <code className="bg-gray-100 px-2 py-0.5 rounded text-xs text-[#075E54]">
                                                        {flow.trigger_type === 'any' ? '*' : flow.trigger_keyword}
                                                    </code>
                                                </td>
                                                <td className="px-6 py-3 text-gray-500 capitalize hidden md:table-cell">
                                                    {flow.trigger_type.replace('_', ' ')}
                                                </td>
                                                <td className="px-6 py-3 text-gray-500 hidden lg:table-cell">{flow.session_name}</td>
                                                <td className="px-6 py-3 text-center">
                                                    <button onClick={() => handleToggleActive(flow)}>
                                                        <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${flow.is_active ? 'bg-[#25D366]' : 'bg-gray-300'}`}>
                                                            <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${flow.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                        </div>
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => openEdit(flow)} className="text-gray-400 hover:text-[#075E54] p-1" title="Edit">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                        <button onClick={() => handleDelete(flow.id)} className="text-gray-400 hover:text-red-500 p-1" title="Delete">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </AuthenticatedLayout>
    );
}
