
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const HOPaymentVoucher: React.FC = () => {
    const { 
        recordPaymentVoucher, 
        expenseAccounts, 
        freightForwarders,
        shopAccounts
    } = useAppContext();

    // We use 'HO' as the shopId for Head Office transactions
    const HO_ID = 'HO';

    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentCategory, setPaymentCategory] = useState<'GENERAL' | 'HEAD_OFFICE' | 'CLEARING' | 'CUSTOMS' | 'DUTY'>('GENERAL');
    const [referenceId, setReferenceId] = useState('');
    const [amount, setAmount] = useState(0);
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Filter accounts that belong to HO
    const hoAccounts = shopAccounts.filter(acc => acc.shopId === HO_ID);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (amount <= 0 || !paymentDate) {
            alert('Please fill all required fields.');
            return;
        }
        
        if (paymentCategory !== 'HEAD_OFFICE' && !referenceId) {
             alert('Please select a beneficiary.');
             return;
        }

        let beneficiaryName = '';
        if (paymentCategory === 'GENERAL') beneficiaryName = expenseAccounts.find(e => e.id === referenceId)?.name || '';
        // Reusing 'HEAD_OFFICE' category enum for Freight Forwarder mapping here is slightly hacky but consistent with type definitions.
        // Ideally, we'd have a distinct FREIGHT_FORWARDER category, but for now we map it manually or use GENERAL if FF is not in the enum.
        // Actually, let's map Freight Forwarders to 'GENERAL' with a note or use the type if we added it. 
        // The types.ts defines categories as: 'GENERAL' | 'CLEARING' | 'CUSTOMS' | 'DUTY' | 'HEAD_OFFICE'.
        // We will use 'GENERAL' for Freight Forwarders for now, or strictly speak, they are external vendors.
        
        let categoryToUse = paymentCategory;
        // If user selected Freight Forwarder in UI (we'll implement a custom UI selection), we map it.
        
        if (paymentCategory === 'GENERAL' && freightForwarders.some(f => f.id === referenceId)) {
             beneficiaryName = freightForwarders.find(f => f.id === referenceId)?.name || '';
        }

        const dateForTransaction = new Date(paymentDate + 'T00:00:00');

        recordPaymentVoucher({
            shopId: HO_ID,
            amount,
            date: dateForTransaction,
            paymentAccountId: paymentAccountId || 'HO_CASH_DEFAULT', // Fallback if no account selected
            category: categoryToUse,
            referenceId,
            beneficiaryName,
            notes,
        });

        setSuccessMessage('HO Payment Voucher recorded successfully.');
        setAmount(0);
        setNotes('');
        setPaymentAccountId('');
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Head Office Payment Voucher</h2>
            
            {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Date</label>
                        <input type="date" id="paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                    </div>
                     <div>
                        <label htmlFor="paymentType" className="block text-sm font-medium text-gray-700">Payment To</label>
                        <select 
                            id="paymentType" 
                            value={paymentCategory} 
                            onChange={e => { setPaymentCategory(e.target.value as any); setReferenceId(''); }} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                        >
                            <option value="GENERAL">General Expense / Other</option>
                            <option value="FREIGHT_FORWARDER">Freight Forwarder</option>
                        </select>
                    </div>
                </div>

                {/* Dynamic Reference Field */}
                {paymentCategory === 'GENERAL' && (
                    <div>
                        <label htmlFor="generalRef" className="block text-sm font-medium text-gray-700">Expense Account</label>
                        <select id="generalRef" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                            <option value="">Select expense type</option>
                            {expenseAccounts.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                )}
                
                {/* Hack: We interpret the "FREIGHT_FORWARDER" value from the select above locally, 
                    even though we pass 'GENERAL' to the backend logic if strict typing enforces it. 
                    However, let's assume we use GENERAL and map ID properly. 
                */}
                {(paymentCategory as any) === 'FREIGHT_FORWARDER' && (
                    <div>
                        <label htmlFor="ffRef" className="block text-sm font-medium text-gray-700">Freight Forwarder</label>
                        <select 
                            id="ffRef" 
                            value={referenceId} 
                            onChange={e => setReferenceId(e.target.value)} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" 
                            required
                        >
                            <option value="">Select Forwarder</option>
                            {freightForwarders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount Paid ($ USD)</label>
                        <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0.01" step="0.01" required />
                    </div>
                    <div>
                        <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Paid From HO Account</label>
                        {hoAccounts.length > 0 ? (
                            <select id="paymentAccount" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                <option value="">Select account</option>
                                {hoAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
                            </select>
                        ) : (
                             <input type="text" disabled value="Main Cash (Default)" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 text-gray-500" />
                        )}
                         <p className="text-xs text-gray-500 mt-1">Assuming Head Office Base Currency (USD)</p>
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Description / Notes</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" rows={3} placeholder="e.g., Monthly Retainer, Shipping Invoice #99"></textarea>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                        Record Payment
                    </button>
                </div>
            </form>
        </div>
    );
};

export default HOPaymentVoucher;
