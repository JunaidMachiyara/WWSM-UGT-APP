
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const PaymentVoucher: React.FC = () => {
    const { 
        shopId, 
        recordPaymentVoucher, 
        expenseAccounts, 
        clearingAgents, 
        customExpenseTypes, 
        shopAccounts, 
        currentShopCurrency 
    } = useAppContext();

    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentCategory, setPaymentCategory] = useState<'GENERAL' | 'CLEARING' | 'CUSTOMS' | 'DUTY' | 'HEAD_OFFICE'>('GENERAL');
    const [referenceId, setReferenceId] = useState(''); // Stores Expense Account ID, Agent ID, etc.
    const [amount, setAmount] = useState(0);
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!shopId || !paymentAccountId || amount <= 0 || !paymentDate) {
            alert('Please fill all required fields.');
            return;
        }
        
        if (paymentCategory !== 'DUTY' && paymentCategory !== 'HEAD_OFFICE' && !referenceId) {
             alert('Please select a beneficiary/account.');
             return;
        }

        let beneficiaryName = '';
        if (paymentCategory === 'GENERAL') beneficiaryName = expenseAccounts.find(e => e.id === referenceId)?.name || '';
        if (paymentCategory === 'CLEARING') beneficiaryName = clearingAgents.find(c => c.id === referenceId)?.name || '';
        if (paymentCategory === 'CUSTOMS') beneficiaryName = customExpenseTypes.find(c => c.id === referenceId)?.name || '';

        const dateForTransaction = new Date(paymentDate + 'T00:00:00');

        recordPaymentVoucher({
            shopId,
            amount,
            date: dateForTransaction,
            paymentAccountId,
            category: paymentCategory,
            referenceId,
            beneficiaryName,
            notes,
        });

        setSuccessMessage('Payment Voucher recorded successfully.');
        
        // Reset Form
        setAmount(0);
        setNotes('');
        setPaymentAccountId('');
        // Keep category and reference for ease of multiple entry
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Payment Voucher</h2>
            
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
                        <label htmlFor="paymentCategory" className="block text-sm font-medium text-gray-700">Payment Category</label>
                        <select 
                            id="paymentCategory" 
                            value={paymentCategory} 
                            onChange={e => { setPaymentCategory(e.target.value as any); setReferenceId(''); }} 
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                        >
                            <option value="GENERAL">General Expense (Rent, Utilities)</option>
                            <option value="CLEARING">Clearing Agent Payment</option>
                            <option value="CUSTOMS">Customs Authority Payment</option>
                            <option value="DUTY">Duty (Revenue Authority)</option>
                            <option value="HEAD_OFFICE">Head Office (Stock Payment)</option>
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
                {paymentCategory === 'CLEARING' && (
                    <div>
                        <label htmlFor="clearingRef" className="block text-sm font-medium text-gray-700">Select Agent</label>
                        <select id="clearingRef" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                            <option value="">Select agent</option>
                            {clearingAgents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
                {paymentCategory === 'CUSTOMS' && (
                    <div>
                        <label htmlFor="customsRef" className="block text-sm font-medium text-gray-700">Select Expense Type</label>
                        <select id="customsRef" value={referenceId} onChange={e => setReferenceId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                            <option value="">Select customs expense</option>
                            {customExpenseTypes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                )}
                 {paymentCategory === 'DUTY' && (
                    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
                        Payment to Revenue Authority for Duty obligations.
                    </div>
                )}
                 {paymentCategory === 'HEAD_OFFICE' && (
                    <div className="p-3 bg-gray-50 rounded border border-gray-200 text-sm text-gray-600">
                        Remittance to Head Office for Stock/Goods received.
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount Paid ({currentShopCurrency.symbol})</label>
                        <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0.01" step="0.01" required />
                    </div>
                    <div>
                        <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Paid From Account</label>
                        <select id="paymentAccount" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                            <option value="">Select cash/bank account</option>
                            {currentShopAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Description / Notes</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" rows={3} placeholder="e.g., Invoice #1234, Partial Payment"></textarea>
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

export default PaymentVoucher;
