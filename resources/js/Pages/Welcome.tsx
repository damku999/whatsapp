import { PageProps } from '@/types';
import { Head, Link } from '@inertiajs/react';

export default function Welcome({
    auth,
    appName,
}: PageProps<{ appName: string }>) {
    return (
        <>
            <Head title="Welcome" />
            <div className="min-h-screen bg-gradient-to-br from-[#075E54] via-[#128C7E] to-[#25D366] flex flex-col">
                {/* Header */}
                <header className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-white text-lg">W</div>
                        <span className="text-white font-bold text-xl">{appName || 'WhatsApp Monks'}</span>
                    </div>
                    <nav className="flex items-center gap-4">
                        {auth.user ? (
                            <Link href={route('dashboard')} className="bg-white text-[#075E54] px-5 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
                                Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link href={route('login')} className="text-white hover:text-white/80 font-medium transition">
                                    Log in
                                </Link>
                                <Link href={route('register')} className="bg-white text-[#075E54] px-5 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
                                    Get Started
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Hero */}
                <main className="flex-1 flex items-center justify-center px-6">
                    <div className="max-w-4xl text-center">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            Automate Your WhatsApp<br />Business Communication
                        </h1>
                        <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
                            Connect your WhatsApp number, send bulk messages, build chatbots, and manage contacts — all from one powerful dashboard.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            {!auth.user && (
                                <>
                                    <Link href={route('register')} className="bg-white text-[#075E54] px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition shadow-lg">
                                        Start Free Trial
                                    </Link>
                                    <Link href={route('login')} className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-white/10 transition">
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Features Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
                            {[
                                { title: 'WhatsApp Sessions', desc: 'Connect multiple WhatsApp numbers via QR scan' },
                                { title: 'Bulk Campaigns', desc: 'Send messages to thousands with smart delays' },
                                { title: 'Chatbot Builder', desc: 'Automate replies with keyword-triggered flows' },
                                { title: 'REST API', desc: 'Integrate WhatsApp into your own applications' },
                                { title: 'Contact Management', desc: 'Import, tag, and segment your contacts' },
                                { title: 'Analytics', desc: 'Track delivery, read rates, and API usage' },
                            ].map((feature) => (
                                <div key={feature.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-left">
                                    <h3 className="text-white font-semibold text-lg mb-2">{feature.title}</h3>
                                    <p className="text-white/70 text-sm">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="px-6 py-6 text-center text-white/50 text-sm">
                    &copy; {new Date().getFullYear()} {appName || 'WhatsApp Monks'}. All rights reserved.
                </footer>
            </div>
        </>
    );
}
