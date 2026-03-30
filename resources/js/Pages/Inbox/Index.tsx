import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';

interface Message {
    id: number;
    from_number: string;
    to_number: string;
    content: string | null;
    message_type: string;
    direction: 'incoming' | 'outgoing';
    status: string;
    created_at: string;
    media_url?: string | null;
}

interface Conversation {
    id: number;
    contact_number: string;
    contact_name: string | null;
    last_message: string | null;
    last_message_type: string;
    last_message_at: string;
    unread_count: number;
    session_id: number;
}

interface Props {
    conversations: Conversation[];
    activeConversation?: Conversation | null;
    messages: Message[];
    sessions: { id: number; name: string }[];
}

export default function InboxIndex({ conversations, activeConversation, messages, sessions }: Props) {
    const [search, setSearch] = useState('');
    const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(activeConversation || null);
    const [showMobileChat, setShowMobileChat] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, reset } = useForm<{
        message: string;
        session_id: number | string;
        to_number: string;
        media: File | null;
    }>({
        message: '',
        session_id: '',
        to_number: '',
        media: null,
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (!selectedConversation) return;
        const interval = setInterval(() => {
            router.reload({ only: ['messages', 'conversations'] });
        }, 5000);
        return () => clearInterval(interval);
    }, [selectedConversation]);

    function openConversation(conv: Conversation) {
        setSelectedConversation(conv);
        setShowMobileChat(true);
        setData((prev) => ({ ...prev, session_id: conv.session_id, to_number: conv.contact_number }));
        router.get(route('inbox.index'), { conversation: conv.id }, {
            preserveState: true,
            preserveScroll: true,
            only: ['messages', 'activeConversation'],
        });
    }

    function sendReply(e: React.FormEvent) {
        e.preventDefault();
        if (!data.message.trim() && !data.media) return;
        post(route('inbox.reply'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                reset('message', 'media');
                setAttachMenuOpen(false);
            },
        });
    }

    function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0] || null;
        setData('media', file);
        setAttachMenuOpen(false);
    }

    const filteredConversations = conversations.filter((c) => {
        const q = search.toLowerCase();
        return (
            c.contact_number.includes(q) ||
            (c.contact_name && c.contact_name.toLowerCase().includes(q))
        );
    });

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Inbox</h2>}>
            <Head title="Inbox" />

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ height: 'calc(100vh - 160px)' }}>
                <div className="flex h-full">
                    {/* Conversation List */}
                    <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col ${showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                        <div className="p-3 border-b">
                            <div className="relative">
                                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search conversations..."
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border-gray-200 focus:border-[#25D366] focus:ring-[#25D366]"
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {filteredConversations.length === 0 ? (
                                <div className="p-8 text-center text-gray-500 text-sm">
                                    {search ? 'No conversations match your search.' : 'No conversations yet.'}
                                </div>
                            ) : (
                                filteredConversations.map((conv) => (
                                    <button
                                        key={conv.id}
                                        onClick={() => openConversation(conv)}
                                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 ${
                                            selectedConversation?.id === conv.id ? 'bg-green-50' : ''
                                        }`}
                                    >
                                        <div className="w-10 h-10 bg-[#075E54] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                            {(conv.contact_name || conv.contact_number).charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <p className="text-sm font-semibold text-gray-800 truncate">
                                                    {conv.contact_name || conv.contact_number}
                                                </p>
                                                <span className="text-xs text-gray-400 shrink-0 ml-2">{conv.last_message_at}</span>
                                            </div>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <p className="text-xs text-gray-500 truncate">
                                                    {conv.last_message_type !== 'text'
                                                        ? `[${conv.last_message_type}]`
                                                        : conv.last_message || 'No messages'}
                                                </p>
                                                {conv.unread_count > 0 && (
                                                    <span className="bg-[#25D366] text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium shrink-0 ml-2">
                                                        {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Chat Panel */}
                    <div className={`flex-1 flex flex-col ${!showMobileChat ? 'hidden md:flex' : 'flex'}`}>
                        {selectedConversation ? (
                            <>
                                {/* Chat Header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b bg-gray-50">
                                    <button
                                        onClick={() => setShowMobileChat(false)}
                                        className="md:hidden text-gray-500 hover:text-gray-700"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                    </button>
                                    <div className="w-9 h-9 bg-[#075E54] rounded-full flex items-center justify-center text-white font-bold text-sm">
                                        {(selectedConversation.contact_name || selectedConversation.contact_number).charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-800 text-sm">
                                            {selectedConversation.contact_name || selectedConversation.contact_number}
                                        </p>
                                        <p className="text-xs text-gray-500">{selectedConversation.contact_number}</p>
                                    </div>
                                </div>

                                {/* Messages */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD]">
                                    {messages.length === 0 ? (
                                        <div className="text-center text-gray-500 text-sm py-8">No messages in this conversation.</div>
                                    ) : (
                                        messages.map((msg) => (
                                            <div
                                                key={msg.id}
                                                className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                                                        msg.direction === 'outgoing'
                                                            ? 'bg-[#DCF8C6] rounded-tr-none'
                                                            : 'bg-white rounded-tl-none'
                                                    }`}
                                                >
                                                    {msg.media_url && msg.message_type === 'image' && (
                                                        <img src={msg.media_url} alt="" className="rounded mb-1 max-w-full" />
                                                    )}
                                                    {msg.media_url && msg.message_type === 'video' && (
                                                        <video src={msg.media_url} controls className="rounded mb-1 max-w-full" />
                                                    )}
                                                    {msg.media_url && msg.message_type === 'audio' && (
                                                        <audio src={msg.media_url} controls className="mb-1 max-w-full" />
                                                    )}
                                                    {msg.media_url && msg.message_type === 'document' && (
                                                        <a
                                                            href={msg.media_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-2 bg-gray-100 px-3 py-2 rounded mb-1 text-xs text-[#075E54] hover:bg-gray-200 transition"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Document
                                                        </a>
                                                    )}
                                                    {msg.content && (
                                                        <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{msg.content}</p>
                                                    )}
                                                    {!msg.content && !msg.media_url && (
                                                        <p className="text-sm text-gray-400 italic">[{msg.message_type}]</p>
                                                    )}
                                                    <div className={`flex items-center gap-1 mt-1 ${msg.direction === 'outgoing' ? 'justify-end' : ''}`}>
                                                        <span className="text-[10px] text-gray-500">{msg.created_at}</span>
                                                        {msg.direction === 'outgoing' && (
                                                            <svg className={`w-3.5 h-3.5 ${msg.status === 'read' ? 'text-blue-500' : 'text-gray-400'}`} fill="currentColor" viewBox="0 0 24 24">
                                                                {msg.status === 'sent' || msg.status === 'pending' ? (
                                                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                                                                ) : (
                                                                    <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                                                                )}
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Box */}
                                <form onSubmit={sendReply} className="p-3 border-t bg-gray-50 flex items-end gap-2">
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                                            className="text-gray-500 hover:text-[#075E54] transition p-2"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                            </svg>
                                        </button>
                                        {attachMenuOpen && (
                                            <div className="absolute bottom-full left-0 mb-2 bg-white rounded-lg shadow-lg border p-2 w-40">
                                                {['image', 'video', 'document', 'audio'].map((type) => (
                                                    <button
                                                        key={type}
                                                        type="button"
                                                        onClick={() => fileInputRef.current?.click()}
                                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded capitalize"
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            className="hidden"
                                            onChange={handleMediaSelect}
                                        />
                                    </div>

                                    <div className="flex-1">
                                        {data.media && (
                                            <div className="flex items-center gap-2 mb-2 bg-green-50 px-3 py-1.5 rounded-lg text-xs text-[#075E54]">
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="truncate">{data.media.name}</span>
                                                <button type="button" onClick={() => setData('media', null)} className="text-red-500 hover:text-red-700 ml-auto">
                                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={data.message}
                                            onChange={(e) => setData('message', e.target.value)}
                                            placeholder="Type a message..."
                                            className="w-full rounded-full border-gray-200 focus:border-[#25D366] focus:ring-[#25D366] text-sm px-4 py-2"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendReply(e);
                                                }
                                            }}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={processing || (!data.message.trim() && !data.media)}
                                        className="bg-[#25D366] text-white p-2.5 rounded-full hover:bg-[#128C7E] transition disabled:opacity-50"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                                <svg className="w-24 h-24 mb-4 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                <h3 className="text-lg font-medium text-gray-500 mb-1">WhatsApp Monks Inbox</h3>
                                <p className="text-sm">Select a conversation to start messaging</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
