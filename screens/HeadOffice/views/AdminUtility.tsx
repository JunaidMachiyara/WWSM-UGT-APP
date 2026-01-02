
import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';

const AdminUtility: React.FC = () => {
    const { resetSystem, clearTransactions } = useAppContext();
    const [isProcessing, setIsProcessing] = useState(false);
    const [securityKey, setSecurityKey] = useState('');
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [confirmArmed, setConfirmArmed] = useState(false); // New explicit arming state
    const [operationLog, setOperationLog] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll terminal
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [operationLog]);

    // Log helper
    const log = (msg: string) => {
        setOperationLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);
    };

    // Strict Unlock Logic
    useEffect(() => {
        const cleanKey = securityKey.trim();
        if (cleanKey === "7860") {
            if (!isUnlocked) {
                setIsUnlocked(true);
                log("SECURITY CLEARED: Console unlocked. Ready to arm.");
            }
        } else {
            if (isUnlocked) {
                setIsUnlocked(false);
                setConfirmArmed(false);
                log("RESTRICTED: Key invalidated. Operations locked.");
            }
        }
    }, [securityKey, isUnlocked]);

    const handleClearTransactions = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isUnlocked || isProcessing || !confirmArmed) {
            log("ABORTED: Command requires ARM switch and Security Key.");
            return;
        }

        setIsProcessing(true);
        log("EXECUTING: Ledger Purge Sequence initiated...");
        try {
            log("CORE: Accessing Database...");
            await clearTransactions();
            log("SUCCESS: Transaction history wiped from all shop ledgers.");
            log("SUCCESS: All physical and bank account opening balances zeroed.");
            log("SUCCESS: System recalibration complete.");
            setConfirmArmed(false); // Disarm after success
        } catch (e: any) {
            log(`CRITICAL ERROR: Operation failed - ${e.message || 'Check connection'}`);
            alert(`Error: ${e.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFullWipe = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isUnlocked || isProcessing || !confirmArmed) {
            log("ABORTED: Full Wipe requires dual authorization (Key + Arm).");
            return;
        }

        setIsProcessing(true);
        log("EXECUTING: Total Database Destruction initiated...");
        try {
            log("CORE: Scrubbing Entity Containers...");
            await resetSystem();
            log("SUCCESS: Database is now empty. Reloading...");
            // System reloads on success automatically via AppContext
        } catch (e: any) {
            log(`FATAL ERROR: ${e.message}`);
            alert(`Fatal Error: ${e.message}`);
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Security Interface */}
            <div className={`bg-white p-8 rounded-2xl shadow-xl border-4 transition-all duration-500 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden ${isUnlocked ? 'border-orange-500 ring-4 ring-orange-500/10' : 'border-gray-100'}`}>
                
                <div className="flex items-center space-x-5 z-10">
                    <div className={`p-5 rounded-2xl transition-all duration-500 transform ${isUnlocked ? 'bg-orange-600 text-white shadow-xl scale-110 rotate-3' : 'bg-red-50 text-red-500'}`}>
                        {isUnlocked ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        )}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 uppercase tracking-tighter italic">System Maintenance</h2>
                        <p className={`text-sm font-bold uppercase tracking-widest ${isUnlocked ? 'text-orange-600 animate-pulse' : 'text-gray-400'}`}>
                            {isUnlocked ? 'OPERATIONS UNLOCKED' : 'AUTH REQUIRED • ENTER MASTER KEY'}
                        </p>
                    </div>
                </div>
                
                <div className="w-full md:w-64 z-10 flex flex-col items-center">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1.5">Master Unlock Key</label>
                    <input 
                        type="password" 
                        value={securityKey}
                        onChange={(e) => setSecurityKey(e.target.value)}
                        placeholder="••••"
                        className={`w-full text-center text-4xl font-black tracking-[0.5em] border-4 rounded-2xl py-4 px-4 outline-none transition-all shadow-inner ${isUnlocked ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 focus:border-red-400 bg-white text-red-500'}`}
                    />
                </div>
            </div>

            {/* Arming Switch (Custom Confirmation Bypass) */}
            <div className={`p-6 rounded-2xl border-2 transition-all duration-500 flex items-center justify-between ${isUnlocked ? 'bg-orange-50 border-orange-200 opacity-100' : 'bg-gray-50 border-gray-100 opacity-30 grayscale pointer-events-none'}`}>
                <div>
                    <h3 className="text-sm font-black text-orange-900 uppercase">Destructive Confirmation Toggle</h3>
                    <p className="text-[10px] text-orange-700 font-bold uppercase tracking-tight">Slide to arm the execution buttons below. This replaces pop-up confirmations.</p>
                </div>
                <div 
                    onClick={() => isUnlocked && setConfirmArmed(!confirmArmed)}
                    className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${confirmArmed ? 'bg-red-600' : 'bg-gray-300'}`}
                >
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${confirmArmed ? 'translate-x-8' : 'translate-x-0'}`}></div>
                </div>
            </div>

            {/* Utility Commands Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Reset Module */}
                <div className={`bg-white p-8 rounded-3xl shadow-lg border-2 transition-all duration-300 transform ${confirmArmed ? 'border-red-600 opacity-100' : 'border-gray-100 opacity-40 grayscale pointer-events-none'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-orange-800 uppercase italic">Zero-Out Ledgers</h3>
                        <span className="text-[10px] font-black bg-red-600 text-white px-2 py-1 rounded">DESTRUCTIVE</span>
                    </div>
                    <ul className="text-xs text-gray-500 space-y-3 mb-8">
                        <li className="flex items-center font-medium"><span className="w-2 h-2 bg-red-600 rounded-full mr-3 animate-ping"></span>Purge all Sales & Expense History</li>
                        <li className="flex items-center font-medium"><span className="w-2 h-2 bg-red-600 rounded-full mr-3"></span>Reset Inventory Quantities to 0</li>
                        <li className="flex items-center font-medium"><span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>Maintain Entities (Shops, Items, Users)</li>
                    </ul>
                    <button 
                        onClick={handleClearTransactions}
                        disabled={!confirmArmed || isProcessing}
                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center ${isProcessing ? 'bg-gray-300 text-gray-500 cursor-wait' : 'bg-gradient-to-br from-red-600 to-red-800 text-white hover:brightness-110 ring-4 ring-red-600/20'}`}
                    >
                        {isProcessing ? 'DELETING RECORDS...' : 'AUTHORIZE PURGE'}
                    </button>
                </div>

                {/* Factory Reset Module */}
                <div className={`bg-white p-8 rounded-3xl shadow-lg border-2 transition-all duration-300 transform ${confirmArmed ? 'border-red-900 opacity-100' : 'border-gray-100 opacity-40 grayscale pointer-events-none'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-black text-red-900 uppercase italic">Factory Wipe</h3>
                        <span className="text-[10px] font-black bg-black text-white px-2 py-1 rounded">ABSOLUTE</span>
                    </div>
                    <p className="text-xs text-red-600 font-bold mb-8 leading-relaxed">
                        CRITICAL WARNING: This deletes EVERYTHING. The database will be entirely scrubbed clean.
                    </p>
                    <button 
                        onClick={handleFullWipe}
                        disabled={!confirmArmed || isProcessing}
                        className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center ${isProcessing ? 'bg-gray-300 text-gray-500 cursor-wait' : 'bg-black text-white hover:bg-gray-900 ring-4 ring-black/20'}`}
                    >
                        {isProcessing ? 'SCRUBBING DATABASE...' : 'WIPE ENTIRE SYSTEM'}
                    </button>
                </div>
            </div>

            {/* Terminal Console */}
            <div className="bg-gray-900 rounded-3xl shadow-2xl p-8 border-4 border-gray-800 overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : isUnlocked ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">ADMIN_CONSOLE_OUTPUT</h4>
                    </div>
                    <button onClick={() => setOperationLog([])} className="text-[10px] text-gray-600 hover:text-gray-300 font-black uppercase tracking-widest transition-colors">Flush Log</button>
                </div>
                <div className="h-64 overflow-y-auto font-mono text-xs text-green-400 space-y-2 custom-scrollbar pr-4 flex flex-col-reverse">
                    <div ref={logEndRef}></div>
                    {operationLog.length === 0 ? (
                        <p className="text-gray-600 italic"># Waiting for operational commands (Key 7860 Required)...</p>
                    ) : (
                        operationLog.map((l, i) => (
                            <div key={i} className={`flex ${l.includes('ERROR') ? 'text-red-500 font-bold bg-red-500/10 rounded px-1' : l.includes('SUCCESS') ? 'text-blue-400 font-bold' : ''}`}>
                                <span className="text-gray-700 mr-2 shrink-0">[{operationLog.length - i}]</span>
                                <p className="break-all">{l}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Audit Trail Note */}
            <div className="p-6 text-center space-y-2">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.4em]">Administrative Access Only • Layer 7 Authorization 7860</p>
                <p className="text-[9px] text-gray-500 italic">All destructive actions are captured in the server-side audit trail.</p>
            </div>
        </div>
    );
};

export default AdminUtility;
