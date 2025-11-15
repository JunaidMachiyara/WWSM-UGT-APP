import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const ReceiptVoucher: React.FC = () => {
    const { shopId, customers, transactions, recordPayment, formatCurrency, currentShopCurrency, shopAccounts } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [customerBalance, setCustomerBalance] = useState(0); // Stored in base currency

    const shopCustomers = customers.filter(c => c.shopId === shopId);
    const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);
    
    useEffect(() => {
        if (customerId) {
            const customerTransactions = transactions.filter(t => t.customerId === customerId && t.shopId === shopId);
            
            const totalDebits = customerTransactions
                .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
                .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);

            const totalCredits = customerTransactions
                .filter(t => t.type === TransactionType.SALES_RECEIPT)
                .reduce((sum, t) => sum + t.amount, 0);

            setCustomerBalance(totalDebits - totalCredits);
        } else {
            setCustomerBalance(0);
        }
    }, [customerId, transactions, shopId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId || !customerId || amount <= 0 || !paymentDate || !paymentAccountId) {
            alert('Please fill all required fields: customer, date, payment account and an amount greater than zero.');
            return;
        }

        const localCustomerBalance = customerBalance * currentShopCurrency.rate;
        if (amount > localCustomerBalance) {
            alert(`Payment amount (${formatCurrency(amount / currentShopCurrency.rate)}) cannot be greater than the outstanding balance (${formatCurrency(customerBalance)}).`);
            return;
        }

        const dateForTransaction = new Date(paymentDate + 'T00:00:00');

        recordPayment({
            shopId,
            customerId,
            amount, // Sent in local currency, context will convert it
            date: dateForTransaction,
            notes,
            paymentAccountId,
        });

        const customerName = customers.find(c => c.id === customerId)?.name || '';
        setSuccessMessage(`Payment of ${formatCurrency(amount / currentShopCurrency.rate)} from "${customerName}" recorded successfully.`);

        setCustomerId('');
        setAmount(0);
        setNotes('');
        setPaymentAccountId('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Customer Payment</h2>
            {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
                    <select
                        id="customer"
                        value={customerId}
                        onChange={e => setCustomerId(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary"
                        required
                    >
                        <option value="">Select a customer</option>
                        {shopCustomers.map(account => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                        ))}
                    </select>
                </div>

                {customerId && (
                    <div className={`flex items-start p-4 rounded-lg border ${
                        customerBalance > 0 
                        ? 'bg-orange-50 border-orange-200' 
                        : 'bg-green-50 border-green-200'
                    }`}>
                        {customerBalance > 0 ? (
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-orange-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                       
                        <div>
                            <p className={`text-sm font-medium ${
                                customerBalance > 0 ? 'text-orange-800' : 'text-green-800'
                            }`}>
                                {customerBalance > 0 ? 'Outstanding Balance' : 'Account Status'}
                            </p>
                            <p className={`text-2xl font-bold ${
                                customerBalance > 0 ? 'text-orange-900' : 'text-green-900'
                            }`}>
                                {formatCurrency(Math.abs(customerBalance))}
                            </p>
                             <p className={`text-xs mt-1 ${
                                customerBalance > 0 ? 'text-orange-700' : 'text-green-700'
                            }`}>
                                {customerBalance > 0 ? 'This is the amount the customer currently owes.' : (customerBalance < 0 ? 'This customer has a credit balance.' : 'This account is fully paid.')}
                            </p>
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                    <input type="date" id="paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" required />
                </div>
                
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount Received ({currentShopCurrency.symbol})</label>
                    <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" min="0.01" step="0.01" required />
                </div>

                <div>
                    <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Deposit To Account</label>
                    <select 
                        id="paymentAccount" 
                        value={paymentAccountId} 
                        onChange={e => setPaymentAccountId(e.target.value)} 
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                        required
                    >
                        <option value="">Select account</option>
                        {currentShopAccounts.map(account => (
                        <option key={account.id} value={account.id}>{account.accountName}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" placeholder="e.g., Payment for invoice #123"/>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300 disabled:opacity-50" disabled={!customerId || amount <= 0}>
                        Record Payment
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ReceiptVoucher;