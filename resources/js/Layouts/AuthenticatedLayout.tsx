import Dropdown from '@/Components/Dropdown';
import NavLink from '@/Components/NavLink';
import ResponsiveNavLink from '@/Components/ResponsiveNavLink';
import { Link, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

const sidebarLinks = [
    { name: 'Dashboard', href: 'dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { name: 'Sessions', href: 'sessions.index', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { name: 'Send Message', href: 'messages.index', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { name: 'Inbox', href: 'inbox.index', icon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4' },
    { name: 'Contacts', href: 'contacts.index', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { name: 'Groups', href: 'groups.index', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { name: 'Campaigns', href: 'campaigns.index', icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
    { name: 'Chatbot', href: 'chatbot.index', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { name: 'Templates', href: 'templates.index', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'API Keys', href: 'api-keys.index', icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z' },
    { name: 'Webhooks', href: 'webhooks.index', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
    { name: 'Reports', href: 'reports.index', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { name: 'Billing', href: 'billing.index', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { name: 'Support', href: 'support.index', icon: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
];

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const user = usePage().props.auth.user;
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-[#075E54] text-white transition-all duration-300 fixed h-full z-30 hidden lg:flex flex-col`}>
                <div className="p-4 flex items-center gap-3 border-b border-[#128C7E]">
                    <div className="w-10 h-10 bg-[#25D366] rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0">W</div>
                    {sidebarOpen && <span className="font-bold text-lg">WhatsApp Monks</span>}
                </div>

                <nav className="flex-1 py-4 overflow-y-auto">
                    {sidebarLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={route(link.href)}
                            className={`flex items-center gap-3 px-4 py-2.5 hover:bg-[#128C7E] transition text-sm ${
                                route().current(link.href) ? 'bg-[#128C7E]' : ''
                            }`}
                        >
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} />
                            </svg>
                            {sidebarOpen && <span>{link.name}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-[#128C7E]">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="flex items-center gap-3 px-2 py-2 hover:bg-[#128C7E] rounded transition text-sm w-full">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M11 19l-7-7 7-7m8 14l-7-7 7-7' : 'M13 5l7 7-7 7M5 5l7 7-7 7'} />
                        </svg>
                        {sidebarOpen && <span>Collapse</span>}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className={`flex-1 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} transition-all duration-300`}>
                {/* Top Bar */}
                <header className="bg-white shadow-sm border-b px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden text-gray-500">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                        </button>
                        {header}
                    </div>
                    <div className="flex items-center gap-4">
                        <Dropdown>
                            <Dropdown.Trigger>
                                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                                    <div className="w-8 h-8 bg-[#25D366] rounded-full flex items-center justify-center text-white font-medium text-xs">
                                        {user.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="hidden sm:inline">{user.name}</span>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                            </Dropdown.Trigger>
                            <Dropdown.Content>
                                <Dropdown.Link href={route('profile.edit')}>Profile</Dropdown.Link>
                                <Dropdown.Link href={route('logout')} method="post" as="button">Log Out</Dropdown.Link>
                            </Dropdown.Content>
                        </Dropdown>
                    </div>
                </header>

                {/* Mobile Sidebar Overlay */}
                {mobileMenuOpen && (
                    <div className="lg:hidden fixed inset-0 z-40">
                        <div className="fixed inset-0 bg-black/50" onClick={() => setMobileMenuOpen(false)} />
                        <aside className="fixed left-0 top-0 w-64 h-full bg-[#075E54] text-white z-50 overflow-y-auto">
                            <div className="p-4 flex items-center gap-3 border-b border-[#128C7E]">
                                <div className="w-10 h-10 bg-[#25D366] rounded-lg flex items-center justify-center font-bold">W</div>
                                <span className="font-bold text-lg">WhatsApp Monks</span>
                            </div>
                            <nav className="py-4">
                                {sidebarLinks.map((link) => (
                                    <Link key={link.href} href={route(link.href)} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#128C7E] transition text-sm" onClick={() => setMobileMenuOpen(false)}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={link.icon} /></svg>
                                        <span>{link.name}</span>
                                    </Link>
                                ))}
                            </nav>
                        </aside>
                    </div>
                )}

                <main className="p-4 lg:p-6">{children}</main>
            </div>
        </div>
    );
}
