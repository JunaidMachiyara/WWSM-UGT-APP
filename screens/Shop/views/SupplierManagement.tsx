
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';

const SupplierManagement: React.FC = () => {
    const { 
        shopId, 
        transactions, 
        currentShopCurrency, 
        updateSupplierOpeningBalance,
        formatCurrency
    } = useAppContext();

    const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
    const [isSaving, setIsSaving] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // Locate the current opening balance for the Supplier in BASE USD
    const currentSupplierOpeningBalanceBase = useMemo(() => {
        const t = transactions.find(t => t.shopId === shopId && t.invoiceId === 'HO-OPENING-BAL');
        if (!t) return 0;
        return t.amount;
    }, [transactions, shopId]);

    useEffect(() => {
        // Convert the base amount back to local currency for the input field
        const localValue = currentSupplierOpeningBalanceBase * currentShopCurrency.rate;
        setOpeningBalance(parseFloat(localValue.toFixed(2)));
    }, [currentSupplierOpeningBalanceBase, currentShopCurrency]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateSupplierOpeningBalance(Number(openingBalance) || 0);
            setSuccessMessage('Head Office Opening Balance has been updated in the ledger.');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (e: any) {
            alert('Failed to update: ' + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4 mb-8">
                    <div className="bg-blue-600 p-4 rounded-2xl text-white shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Supplier Setup: Head Office</h2>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Main Exporter & System Admin</p>
                    </div>
                </div>

                {successMessage && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg animate-pulse">
                        <p className="text-green-700 font-bold text-sm">{successMessage}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <label htmlFor="hoOpeningBal" className="block text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Starting (Opening) Payable Balance</label>
                        <div className="flex items-center space-x-3">
                            <span className="text-3xl font-black text-gray-400">{currentShopCurrency.symbol}</span>
                            <input 
                                type="number" 
                                id="hoOpeningBal" 
                                value={openingBalance} 
                                onChange={e => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))}
                                className="w-full text-4xl font-black bg-transparent outline-none text-gray-900 border-b-4 border-gray-200 focus:border-blue-600 transition-colors py-2"
                                step="0.01"
                                placeholder="0.00"
                            />
                        </div>
                        <div className="mt-4 flex items-start space-x-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <p className="text-[11px] text-blue-800 font-bold leading-relaxed uppercase tracking-tight">
                                Use this to record debt migrated from legacy systems. 
                                <br/>POSITIVE = You owe HO (Account Payable).
                                <br/>NEGATIVE = HO owes you (Account Receivable / Overpayment).
                            </p>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center space-x-3 ${isSaving ? 'bg-gray-300 text-gray-500' : 'bg-primary text-white hover:bg-primary-dark'}`}
                        >
                            {isSaving ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Syncing Ledger...</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                                    <span>Commit Opening Balance</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-lg">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Financial Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Current Ledger Worth</p>
                        {/* FIXED: Passing USD Base amount directly to formatCurrency */}
                        <p className="text-xl font-black text-gray-900">{formatCurrency(currentSupplierOpeningBalanceBase)}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Impact on Balance Sheet</p>
                        <p className={`text-xl font-black ${currentSupplierOpeningBalanceBase >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {currentSupplierOpeningBalanceBase >= 0 ? 'LIABILITY' : 'ASSET'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierManagement;
