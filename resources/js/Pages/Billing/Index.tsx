import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import { useState } from 'react';

interface Plan { id: number; name: string; slug: string; price_monthly: number; price_yearly: number; max_sessions: number; max_messages_per_day: number; max_contacts: number; has_api_access: boolean; has_webhooks: boolean; has_group_messaging: boolean; description: string; }
interface Subscription { id: number; plan: Plan; status: string; start_date: string; end_date: string; amount_paid: number; }
interface Transaction { id: number; amount: number; currency: string; status: string; payment_method: string; utr_number: string; created_at: string; }
interface Usage { messages_today: number; messages_limit: number; contacts_count: number; contacts_limit: number; sessions_count: number; sessions_limit: number; }

interface Props { currentPlan: Subscription | null; usage: Usage; plans: Plan[]; transactions: { data: Transaction[] }; }

export default function Billing({ currentPlan, usage, plans, transactions }: Props) {
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [showUpi, setShowUpi] = useState(false);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

    const upiForm = useForm({ plan_id: 0, utr_number: '', screenshot: null as File | null, payment_method: 'upi_manual', billing_cycle: 'monthly' });

    const usageBars = [
        { label: 'Messages Today', used: usage?.messages_today ?? 0, limit: usage?.messages_limit ?? 500, color: 'bg-blue-500' },
        { label: 'Contacts', used: usage?.contacts_count ?? 0, limit: usage?.contacts_limit ?? 1000, color: 'bg-purple-500' },
        { label: 'Sessions', used: usage?.sessions_count ?? 0, limit: usage?.sessions_limit ?? 1, color: 'bg-green-500' },
    ];

    const handleSubscribe = (planId: number, method: string) => {
        if (method === 'upi_manual') {
            upiForm.setData('plan_id', planId);
            upiForm.setData('billing_cycle', billingCycle);
            setShowUpi(true);
        } else {
            router.post(route('billing.subscribe'), { plan_id: planId, payment_method: 'razorpay', billing_cycle: billingCycle });
        }
    };

    const submitUpi = () => {
        upiForm.post(route('billing.upi-payment'), { onSuccess: () => setShowUpi(false) });
    };

    return (
        <AuthenticatedLayout header={<h2 className="text-xl font-semibold text-gray-800">Billing & Subscription</h2>}>
            <Head title="Billing" />

            {/* Current Plan */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Current Plan</h3>
                    {currentPlan ? (
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-2xl font-bold text-[#075E54]">{currentPlan.plan?.name}</p>
                                <p className="text-gray-500 mt-1">Expires: {currentPlan.end_date}</p>
                                <span className={`inline-block mt-2 px-3 py-1 text-xs rounded-full ${currentPlan.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{currentPlan.status}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold">&#8377;{currentPlan.amount_paid}</p>
                                <button onClick={() => setShowUpgrade(!showUpgrade)} className="mt-2 text-sm text-[#128C7E] hover:underline">
                                    {showUpgrade ? 'Hide Plans' : 'Upgrade Plan'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-gray-500 mb-3">No active subscription</p>
                            <button onClick={() => setShowUpgrade(true)} className="bg-[#25D366] text-white px-6 py-2 rounded-lg hover:bg-[#128C7E]">Choose a Plan</button>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="font-semibold text-gray-800 mb-4">Usage</h3>
                    <div className="space-y-4">
                        {usageBars.map(bar => (
                            <div key={bar.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{bar.label}</span>
                                    <span className="font-medium">{bar.used.toLocaleString()}/{bar.limit.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className={`${bar.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min((bar.used / bar.limit) * 100, 100)}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Plans */}
            {(showUpgrade || !currentPlan) && (
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-semibold text-gray-800">Available Plans</h3>
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            <button onClick={() => setBillingCycle('monthly')} className={`px-4 py-1.5 text-sm rounded-md transition ${billingCycle === 'monthly' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>Monthly</button>
                            <button onClick={() => setBillingCycle('yearly')} className={`px-4 py-1.5 text-sm rounded-md transition ${billingCycle === 'yearly' ? 'bg-white shadow-sm font-medium' : 'text-gray-500'}`}>Yearly (Save 17%)</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {plans?.map(plan => (
                            <div key={plan.id} className={`bg-white rounded-xl shadow-sm p-6 border-2 transition ${currentPlan?.plan?.id === plan.id ? 'border-[#25D366]' : 'border-gray-100 hover:border-gray-200'}`}>
                                <h4 className="font-bold text-lg">{plan.name}</h4>
                                <p className="text-3xl font-bold text-[#075E54] mt-2">
                                    &#8377;{billingCycle === 'monthly' ? plan.price_monthly : plan.price_yearly}
                                    <span className="text-sm text-gray-500 font-normal">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                                </p>
                                <ul className="mt-4 space-y-2 text-sm">
                                    <li>{plan.max_sessions} sessions</li>
                                    <li>{plan.max_messages_per_day.toLocaleString()} msg/day</li>
                                    <li>{plan.max_contacts.toLocaleString()} contacts</li>
                                    <li>{plan.has_api_access ? 'API Access' : 'No API'}</li>
                                </ul>
                                {currentPlan?.plan?.id !== plan.id && (
                                    <div className="mt-4 space-y-2">
                                        <button onClick={() => handleSubscribe(plan.id, 'razorpay')} className="w-full bg-[#25D366] text-white py-2 rounded-lg text-sm hover:bg-[#128C7E]">Pay Online</button>
                                        <button onClick={() => handleSubscribe(plan.id, 'upi_manual')} className="w-full border border-gray-300 py-2 rounded-lg text-sm hover:bg-gray-50">Pay via UPI</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* UPI Payment Modal */}
            {showUpi && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md">
                        <h3 className="font-semibold text-lg mb-4">Manual UPI Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">UTR Number</label>
                                <input type="text" value={upiForm.data.utr_number} onChange={e => upiForm.setData('utr_number', e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Enter UTR/Transaction ID" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Screenshot</label>
                                <input type="file" accept="image/*" onChange={e => upiForm.setData('screenshot', e.target.files?.[0] || null)} className="w-full border rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={submitUpi} disabled={upiForm.processing} className="flex-1 bg-[#25D366] text-white py-2 rounded-lg text-sm hover:bg-[#128C7E] disabled:opacity-50">Submit for Review</button>
                                <button onClick={() => setShowUpi(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction History */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="px-6 py-4 border-b"><h3 className="font-semibold text-gray-800">Transaction History</h3></div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Amount</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Method</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Invoice</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {transactions?.data?.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm">{new Date(t.created_at).toLocaleDateString()}</td>
                                    <td className="px-4 py-3 text-sm font-medium">&#8377;{t.amount}</td>
                                    <td className="px-4 py-3 text-sm">{t.payment_method || 'N/A'}</td>
                                    <td className="px-4 py-3"><span className={`px-2 py-0.5 text-xs rounded-full ${t.status === 'completed' ? 'bg-green-100 text-green-700' : t.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span></td>
                                    <td className="px-4 py-3">{t.status === 'completed' && <a href={route('billing.invoice', t.id)} className="text-sm text-[#128C7E] hover:underline">Download</a>}</td>
                                </tr>
                            )) ?? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No transactions yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
