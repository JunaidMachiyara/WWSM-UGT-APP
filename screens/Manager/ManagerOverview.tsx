
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { TransactionType, ShipmentStatus, AlertType } from '../../types';
import Layout from '../../components/Layout';

// Icons
const ShopIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>;
const AlertIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>;
const TruckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>;

const ManagerOverview: React.FC = () => {
    const { shops, currentUser, transactions, switchShop, logout, alerts, shipments, formatCurrency } = useAppContext();
    const [activeInboxTab, setActiveInboxTab] = useState<'ALERTS' | 'EXPORTS'>('ALERTS');
    
    const assignedShopIds = currentUser?.allowedShopIds || [];
    const myShops = shops.filter(s => assignedShopIds.includes(s.id));

    // Filter Alerts for Manager's supervised shops
    const regionalPriceViolations = useMemo(() => {
        return alerts.filter(a => 
            a.type === AlertType.PRICE_VIOLATION && 
            !a.isRead && 
            assignedShopIds.includes(a.context?.shopId || '')
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [alerts, assignedShopIds]);

    // Filter Pending Shipments for Manager's supervised shops
    const regionalPendingExports = useMemo(() => {
        return shipments.filter(s => 
            s.status === ShipmentStatus.PENDING && 
            assignedShopIds.includes(s.shopId)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [shipments, assignedShopIds]);

    const shopStats = useMemo(() => {
        return myShops.map(shop => {
            const shopTrans = transactions.filter(t => t.shopId === shop.id);
            const shopAlerts = regionalPriceViolations.filter(a => a.context?.shopId === shop.id);
            const shopShipments = regionalPendingExports.filter(s => s.shopId === shop.id);
            
            const totalSales = shopTrans
                .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
                .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);

            const totalExpenses = shopTrans
                .filter(t => t.type === TransactionType.EXPENSE)
                .reduce((sum, t) => sum + t.amount, 0);

            return {
                id: shop.id,
                name: shop.name,
                location: `${shop.district}, ${shop.country}`,
                sales: totalSales,
                profit: totalSales - totalExpenses,
                priceViolations: shopAlerts.length,
                pendingExports: shopShipments.length
            };
        });
    }, [myShops, transactions, regionalPriceViolations, regionalPendingExports]);

    const SidebarContent = (
        <div className="flex justify-between items-center h-16 px-6">
            <div className="flex items-center space-x-3">
                <span className="text-xl font-black text-primary tracking-tighter">REGIONAL PORTAL</span>
                <div className="h-6 w-px bg-gray-200"></div>
                <span className="text-xs font-bold text-gray-500">{myShops.length} SUPERVISED LOCATIONS</span>
            </div>
            <div className="flex items-center space-x-4">
                <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 leading-none">{currentUser?.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Oversight Manager</p>
                </div>
                <button onClick={logout} className="text-sm text-red-600 font-bold hover:bg-red-50 px-3 py-2 rounded-lg transition-colors border border-transparent hover:border-red-100">Logout</button>
            </div>
        </div>
    );

    return (
        <Layout sidebar={SidebarContent} title="Regional Command Center">
            <div className="flex flex-col lg:flex-row gap-8">
                
                {/* 1. Main Dashboard Grid */}
                <div className="flex-1 space-y-8">
                    {/* High-Level Regional Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total Regional Sales</p>
                            <p className="text-3xl font-black text-gray-900">{formatCurrency(shopStats.reduce((s, st) => s + st.sales, 0))}</p>
                        </div>
                        <div className={`p-6 rounded-2xl shadow-lg border transition-all ${regionalPriceViolations.length > 0 ? 'bg-red-50 border-red-200 animate-pulse' : 'bg-white border-gray-100'}`}>
                            <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${regionalPriceViolations.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>Active Price Violations</p>
                            <p className={`text-3xl font-black ${regionalPriceViolations.length > 0 ? 'text-red-700' : 'text-gray-900'}`}>{regionalPriceViolations.length}</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Exports In Pipeline</p>
                            <p className="text-3xl font-black text-blue-600">{regionalPendingExports.length}</p>
                        </div>
                    </div>

                    {/* Shop Cards Grid */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {shopStats.map(stat => (
                            <div key={stat.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 hover:shadow-2xl transition-all">
                                <div className={`p-6 text-white ${stat.priceViolations > 0 ? 'bg-gradient-to-r from-red-600 to-red-800' : 'bg-gradient-to-r from-primary to-blue-700'}`}>
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center space-x-3">
                                            <div className="bg-white/20 p-2 rounded-lg"><ShopIcon /></div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase tracking-tighter italic">{stat.name}</h3>
                                                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{stat.location}</p>
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            {stat.priceViolations > 0 && <span className="bg-white text-red-600 text-[10px] font-black px-2 py-1 rounded-full border border-red-100 shadow-md animate-bounce">! {stat.priceViolations} ALARMS</span>}
                                            {stat.pendingExports > 0 && <span className="bg-blue-400 text-white text-[10px] font-black px-2 py-1 rounded-full shadow-md">{stat.pendingExports} EXPORTS</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6">
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Gross Sales</p>
                                            <p className="text-lg font-black text-gray-900">{formatCurrency(stat.sales)}</p>
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                            <p className="text-[9px] font-bold text-gray-400 uppercase">Operating profit</p>
                                            <p className={`text-lg font-black ${stat.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(stat.profit)}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => switchShop(stat.id)}
                                        className={`w-full py-3 rounded-xl font-black text-sm transition-all shadow-md flex items-center justify-center space-x-2 ${
                                            stat.priceViolations > 0 ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-primary hover:bg-primary-dark text-white'
                                        }`}
                                    >
                                        <span>{stat.priceViolations > 0 ? 'INVESTIGATE ALARMS' : 'MANAGE SHOP'}</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. Regional Priority Inbox */}
                <div className="w-full lg:w-[450px] bg-white rounded-3xl shadow-2xl border border-gray-100 flex flex-col h-[calc(100vh-12rem)] sticky top-24">
                    <div className="p-6 border-b border-gray-100 bg-gray-50 rounded-t-3xl">
                        <h3 className="text-xl font-black text-gray-800 tracking-tighter mb-4">REGIONAL PRIORITY INBOX</h3>
                        <div className="flex bg-gray-200 p-1 rounded-xl">
                            <button 
                                onClick={() => setActiveInboxTab('ALERTS')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${activeInboxTab === 'ALERTS' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                PRICE ALARMS ({regionalPriceViolations.length})
                            </button>
                            <button 
                                onClick={() => setActiveInboxTab('EXPORTS')}
                                className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${activeInboxTab === 'EXPORTS' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                EXPORT PIPELINE ({regionalPendingExports.length})
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {activeInboxTab === 'ALERTS' ? (
                            regionalPriceViolations.length > 0 ? regionalPriceViolations.map((a: any) => (
                                <div key={a.id} className="p-4 bg-red-50 border-l-4 border-red-600 rounded-r-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-red-700 uppercase">{a.context?.shopName}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{new Date(a.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-red-900 font-bold leading-tight mb-3">{a.message}</p>
                                    <div className="flex justify-between items-center pt-3 border-t border-red-100">
                                        <span className="text-[9px] font-mono text-red-600">INV: {a.context?.invoiceId}</span>
                                        <button 
                                            onClick={() => switchShop(a.context?.shopId)}
                                            className="text-[10px] font-black text-red-700 underline uppercase hover:text-red-900"
                                        >
                                            Audit Shop →
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 opacity-30">
                                    <AlertIcon />
                                    <p className="text-xs font-bold uppercase mt-2">All prices compliant</p>
                                </div>
                            )
                        ) : (
                            regionalPendingExports.length > 0 ? regionalPendingExports.map((s: any) => (
                                <div key={s.id} className="p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-black text-blue-700 uppercase">{shops.find(sh => sh.id === s.shopId)?.name}</span>
                                        <span className="text-[10px] text-gray-400 font-bold">{new Date(s.date).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-sm text-blue-900 font-bold leading-tight mb-2">Export #{s.id.split('-')[0]} is in transit.</p>
                                    <p className="text-[10px] text-blue-600/70 mb-3">Manifest: {s.items.length} product lines</p>
                                    <div className="flex justify-between items-center pt-3 border-t border-blue-100">
                                        <span className="text-[9px] font-bold text-blue-600 uppercase">Status: {s.status}</span>
                                        <button 
                                            onClick={() => switchShop(s.shopId)}
                                            className="text-[10px] font-black text-blue-700 underline uppercase hover:text-blue-900"
                                        >
                                            Track Shipment →
                                        </button>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-20 opacity-30">
                                    <TruckIcon />
                                    <p className="text-xs font-bold uppercase mt-2">Pipeline Empty</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default ManagerOverview;
