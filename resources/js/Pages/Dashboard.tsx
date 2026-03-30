import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

interface Stats {
    totalContacts: number;
    activeSessions: number;
    messagesToday: number;
    activeCampaigns: number;
}

interface Props {
    stats: Stats;
    subscription: any;
    recentMessages: any[];
}

export default function Dashboard({ stats, subscription, recentMessages }: Props) {
    const statCards = [
        { label: 'Active Sessions', value: stats?.activeSessions ?? 0, color: 'bg-green-50 text-green-600', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
        { label: 'Messages Today', value: stats?.messagesToday ?? 0, color: 'bg-blue-50 text-blue-600', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
        { label: 'Total Contacts', value: stats?.totalContacts ?? 0, color: 'bg-purple-50 text-purple-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
        { label: 'Active Campaigns', value: stats?.activeCampaigns ?? 0, color: 'bg-orange-50 text-orange-600', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    ];

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Dashboard</h2>}>
            <Head title="Dashboard" />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {statCards.map((card) => (
                    <div key={card.label} className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">{card.label}</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value.toLocaleString()}</p>
                            </div>
                            <div className={`w-11 h-11 ${card.color} rounded-lg flex items-center justify-center`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} />
                                </svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subscription Info */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Current Plan</h3>
                    {subscription ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-[#075E54]">{subscription.plan?.name}</span>
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700">Active</span>
                            </div>
                            <p className="text-sm text-gray-500">Expires: {subscription.end_date}</p>
                            <div className="pt-3">
                                <a href={route('billing.index')} className="text-sm text-[#128C7E] hover:text-[#075E54] font-medium">
                                    Manage Billing &rarr;
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-gray-500 mb-3">No active subscription</p>
                            <a href={route('billing.index')} className="inline-block bg-[#25D366] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#128C7E]">
                                Choose a Plan
                            </a>
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Send Message', href: 'messages.index', color: 'bg-[#25D366]' },
                            { label: 'New Campaign', href: 'campaigns.index', color: 'bg-blue-500' },
                            { label: 'Add Contact', href: 'contacts.index', color: 'bg-purple-500' },
                            { label: 'View Inbox', href: 'inbox.index', color: 'bg-orange-500' },
                        ].map((action) => (
                            <a key={action.label} href={route(action.href)} className={`${action.color} text-white text-center py-3 rounded-lg text-sm font-medium hover:opacity-90 transition`}>
                                {action.label}
                            </a>
                        ))}
                    </div>
                </div>

                {/* Recent Messages */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                    <div className="px-6 py-4 border-b">
                        <h3 className="font-semibold text-gray-800">Recent Messages</h3>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                        {recentMessages && recentMessages.length > 0 ? (
                            recentMessages.map((msg: any) => (
                                <div key={msg.id} className="px-6 py-3">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm font-medium text-gray-800">{msg.to_number || msg.from_number}</p>
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${msg.status === 'delivered' ? 'bg-green-100 text-green-700' : msg.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {msg.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate mt-0.5">{msg.content || `[${msg.message_type}]`}</p>
                                </div>
                            ))
                        ) : (
                            <div className="px-6 py-8 text-center text-gray-500 text-sm">No messages yet. Send your first message!</div>
                        )}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
