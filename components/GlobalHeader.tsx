
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

const GlobalHeader: React.FC = () => {
    const { currentUser, role, shops, shopId, switchShop, logout } = useAppContext();
    const [isShopSwitcherOpen, setIsShopSwitcherOpen] = useState(false);
    const switcherRef = useRef<HTMLDivElement>(null);

    const isManager = role === UserRole.MANAGER;
    const isHO = role === UserRole.HEAD_OFFICE;
    
    const allowedShops = useMemo(() => {
        if (isHO) return shops.filter(s => s.isActive).sort((a,b) => a.name.localeCompare(b.name));
        if (isManager) {
            const allowedIds = currentUser?.allowedShopIds || [];
            return shops.filter(s => s.isActive && allowedIds.includes(s.id)).sort((a,b) => a.name.localeCompare(b.name));
        }
        return [];
    }, [shops, currentUser, isHO, isManager]);

    const currentContextName = useMemo(() => {
        if (!shopId) {
            if (isHO) return "Head Office Portal";
            if (isManager) return "Manager Portal";
        }
        return shops.find(s => s.id === shopId)?.name || "Select a Location";
    }, [shopId, shops, isHO, isManager]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (switcherRef.current && !switcherRef.current.contains(event.target as Node)) {
                setIsShopSwitcherOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSwitch = (newShopId: string | null) => {
        switchShop(newShopId);
        setIsShopSwitcherOpen(false);
    };

    return (
        <header className="bg-white shadow-md border-b border-gray-200 w-full z-40">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    {/* Left Side: Brand */}
                    <div className="flex-shrink-0 flex items-center">
                        <div>
                            <span className="text-2xl font-extrabold text-primary tracking-tight">Usman Global</span>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider -mt-1">Africa Shops Managment Utility</p>
                        </div>
                    </div>

                    {/* Right Side: Switcher, User, Logout */}
                    <div className="flex items-center space-x-6">
                        {/* Shop Switcher */}
                        <div className="relative" ref={switcherRef}>
                            <button
                                onClick={() => setIsShopSwitcherOpen(!isShopSwitcherOpen)}
                                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
                                <span className="text-sm font-bold text-gray-800">{currentContextName}</span>
                                <svg className={`h-4 w-4 text-gray-500 transition-transform ${isShopSwitcherOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </button>

                            {isShopSwitcherOpen && (
                                <div className="absolute right-0 mt-2 w-72 rounded-xl shadow-2xl bg-white ring-1 ring-black ring-opacity-5 z-50 animate-fade-in-down origin-top-right overflow-hidden">
                                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Switch Context</p>
                                    </div>
                                    <div className="py-2 max-h-96 overflow-y-auto">
                                        <button
                                            onClick={() => handleSwitch(null)}
                                            className={`block w-full text-left px-5 py-3 text-sm transition-colors flex items-center justify-between group ${!shopId ? 'bg-blue-50 text-primary font-bold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                        >
                                            <span>{isHO ? 'Head Office Portal' : 'Manager Portal'}</span>
                                            {!shopId && <span className="text-primary font-bold">&check;</span>}
                                        </button>
                                        <div className="mx-4 my-1 h-px bg-gray-100"></div>
                                        {allowedShops.map(shop => (
                                            <button
                                                key={shop.id}
                                                onClick={() => handleSwitch(shop.id)}
                                                className={`block w-full text-left px-5 py-3 text-sm transition-colors flex items-center justify-between group ${shopId === shop.id ? 'bg-blue-50 text-primary font-bold' : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'}`}
                                            >
                                                <span>{shop.name}</span>
                                                {shopId === shop.id && <span className="text-primary font-bold">&check;</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* User Info & Logout */}
                        <div className="flex items-center space-x-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-bold text-gray-900 leading-tight">{currentUser?.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold leading-tight">{currentUser?.role.replace('_', ' ')}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                title="Logout"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default GlobalHeader;
