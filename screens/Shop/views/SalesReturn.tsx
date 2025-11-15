import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Transaction, TransactionType } from '../../../types';

interface ReturnItem {
  productId: string;
  productName: string;
  originalQty: number;
  returnQty: number;
  salePrice: number; // in local currency
}

const SalesReturn: React.FC = () => {
    const { shopId, customers, transactions, products, recordSalesReturn, currentShopCurrency, formatCurrency, shopAccounts, warehouses, shops } = useAppContext();

    const [customerId, setCustomerId] = useState('');
    const [invoiceId, setInvoiceId] = useState('');
    const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
    const [reason, setReason] = useState('');
    const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
    const [refundMethod, setRefundMethod] = useState<'credit' | 'cash'>('credit');
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [locationId, setLocationId] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState('');

    const shopCustomers = useMemo(() => customers.filter(c => c.shopId === shopId), [customers, shopId]);
    const currentShopAccounts = useMemo(() => shopAccounts.filter(acc => acc.shopId === shopId), [shopAccounts, shopId]);

    const locations = useMemo(() => {
        const currentShop = shops.find(s => s.id === shopId);
        if (!currentShop) return [];
        const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
        return [
            { id: currentShop.id, name: `${currentShop.name} (Shop)` },
            ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
        ];
    }, [shops, warehouses, shopId]);

    const customerInvoices = useMemo(() => {
        if (!customerId) return [];
        const customerSaleTransactions = transactions.filter(t => 
            t.customerId === customerId && 
            t.shopId === shopId && 
            (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
        );
        const uniqueInvoiceIds = [...new Set(customerSaleTransactions.map(t => t.invoiceId).filter(Boolean))];
        return uniqueInvoiceIds.map(id => ({
            id,
            date: customerSaleTransactions.find(t => t.invoiceId === id)?.date
        }));
    }, [customerId, transactions, shopId]);

    const customerBalance = useMemo(() => {
        if (!customerId) return 0;
        const customerTransactions = transactions.filter(t => t.customerId === customerId && t.shopId === shopId);

        const totalDebits = customerTransactions
            .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
            .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);

        const totalCredits = customerTransactions
            .filter(t => t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN)
            .reduce((sum, t) => {
                if(t.type === TransactionType.SALES_RETURN) return sum + (t.amount * (t.quantity || 1));
                return sum + t.amount;
            }, 0);
        
        return totalDebits - totalCredits;
    }, [customerId, transactions, shopId]);

    const invoiceDetails = useMemo(() => {
        if(!invoiceId) return null;

        const invoiceTransactions = transactions.filter(t => t.invoiceId === invoiceId);

        const invoiceTotal = invoiceTransactions
            .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
            .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
        
        const invoicePaid = invoiceTransactions
            .filter(t => t.type === TransactionType.SALES_RECEIPT)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            total: invoiceTotal,
            paid: invoicePaid,
            balance: invoiceTotal - invoicePaid
        };

    }, [invoiceId, transactions]);


    const handleInvoiceSelect = (selectedInvoiceId: string) => {
        setInvoiceId(selectedInvoiceId);
        setLocationId(shopId || '');
        const invoiceTransactions = transactions.filter(t => t.invoiceId === selectedInvoiceId);
        const items: ReturnItem[] = invoiceTransactions
            .filter(t => t.productId)
            .map(t => ({
                productId: t.productId!,
                productName: products.find(p => p.id === t.productId)?.name || 'Unknown',
                originalQty: t.quantity || 0,
                returnQty: 0,
                salePrice: t.amount * currentShopCurrency.rate, // convert base price to local
            }));
        setReturnItems(items);
    };

    const handleReturnQtyChange = (productId: string, qty: number) => {
        setReturnItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const newQty = Math.max(0, Math.min(item.originalQty, qty));
                return { ...item, returnQty: newQty };
            }
            return item;
        }));
    };

    const totalReturnValue = useMemo(() => {
        return returnItems.reduce((sum, item) => sum + (item.returnQty * item.salePrice), 0);
    }, [returnItems]);

    const resetForm = () => {
        setCustomerId('');
        setInvoiceId('');
        setReturnItems([]);
        setReason('');
        setReturnDate(new Date().toISOString().split('T')[0]);
        setRefundMethod('credit');
        setPaymentAccountId('');
        setLocationId('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId || !customerId || !invoiceId || !reason || !locationId || returnItems.every(i => i.returnQty === 0)) {
            alert('Please select a customer, invoice, return location, provide a reason, and enter a return quantity for at least one item.');
            return;
        }
        if (refundMethod === 'cash' && !paymentAccountId) {
            alert('Please select an account for the cash refund.');
            return;
        }

        const dateForTransaction = new Date(returnDate + 'T00:00:00');

        recordSalesReturn({
            shopId,
            customerId,
            invoiceId,
            returnedItems: returnItems
                .filter(i => i.returnQty > 0)
                .map(i => ({ productId: i.productId, quantity: i.returnQty, salePrice: i.salePrice })),
            reason,
            date: dateForTransaction,
            refundMethod,
            paymentAccountId: refundMethod === 'cash' ? paymentAccountId : undefined,
            locationId,
        });

        setSuccessMessage(`Return for invoice #${invoiceId} processed successfully.`);
        resetForm();
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Process Sales Return or Claim</h2>
            {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Select Customer & Invoice */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
                        <select id="customer" value={customerId} onChange={e => { setCustomerId(e.target.value); setInvoiceId(''); setReturnItems([]); }} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                            <option value="">Select a customer</option>
                            {shopCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="invoice" className="block text-sm font-medium text-gray-700">Invoice</label>
                        <select id="invoice" value={invoiceId} onChange={e => handleInvoiceSelect(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" disabled={!customerId} required>
                            <option value="">Select an invoice</option>
                            {customerInvoices.map(inv => <option key={inv.id} value={inv.id!}>{inv.id} (on {new Date(inv.date!).toLocaleDateString()})</option>)}
                        </select>
                    </div>
                </div>

                {/* Customer & Invoice Financial Info */}
                {customerId && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                        <div>
                            <h4 className="text-md font-semibold text-gray-700">Customer Balance</h4>
                            <p className={`text-xl font-bold ${customerBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(customerBalance)}
                            </p>
                            <p className="text-xs text-gray-500">
                                {customerBalance > 0 ? "Customer has an outstanding balance." : "Customer has a credit or zero balance."}
                            </p>
                        </div>

                        {invoiceDetails && (
                            <div className="border-t border-gray-200 pt-4">
                                <h4 className="text-md font-semibold text-gray-700">Invoice #{invoiceId} Summary</h4>
                                <div className="grid grid-cols-3 gap-4 text-sm mt-2">
                                    <div>
                                        <p className="text-gray-500">Invoice Total</p>
                                        <p className="font-semibold text-gray-800">{formatCurrency(invoiceDetails.total)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Amount Paid</p>
                                        <p className="font-semibold text-green-600">{formatCurrency(invoiceDetails.paid)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Balance Due</p>
                                        <p className="font-semibold text-red-600">{formatCurrency(invoiceDetails.balance)}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* Step 2: Return Items */}
                {invoiceId && (
                    <div className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Items on Invoice #{invoiceId}</h3>
                        <div className="space-y-3">
                            {returnItems.map(item => (
                                <div key={item.productId} className="grid grid-cols-12 gap-4 items-center">
                                    <div className="col-span-5 text-sm font-medium text-gray-800">{item.productName}</div>
                                    <div className="col-span-3 text-sm text-gray-600">Sold: {item.originalQty}</div>
                                    <div className="col-span-4">
                                        <label htmlFor={`return-${item.productId}`} className="text-sm font-medium text-gray-700 sr-only">Return Qty</label>
                                        <input 
                                          type="number" 
                                          id={`return-${item.productId}`}
                                          value={item.returnQty}
                                          onChange={e => handleReturnQtyChange(item.productId, parseInt(e.target.value))}
                                          className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" 
                                          max={item.originalQty}
                                          min="0"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Step 3: Reason, Date, Refund Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="returnDate" className="block text-sm font-medium text-gray-700">Return Date</label>
                        <input type="date" id="returnDate" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                    </div>
                     <div>
                        <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Return/Claim</label>
                        <input type="text" id="reason" value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required placeholder="e.g., Damaged, Discount"/>
                    </div>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                     <h3 className="text-lg font-semibold text-gray-800 mb-4">Disposition & Refund</h3>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="location" className="block text-sm font-medium text-gray-700">Return Items To:</label>
                             <select id="location" value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required disabled={returnItems.length === 0}>
                                <option value="">Select location</option>
                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                        </div>
                        <div className="border-t pt-4">
                             <div className="flex justify-between items-center text-xl font-bold mb-4">
                                <span className="text-gray-800">Total Return Value:</span>
                                <span className="text-primary">{formatCurrency(totalReturnValue / currentShopCurrency.rate)}</span>
                            </div>
                            <div className="flex items-center">
                                <input id="refund-credit" name="refund-method" type="radio" checked={refundMethod === 'credit'} onChange={() => setRefundMethod('credit')} className="focus:ring-primary h-4 w-4 text-primary border-gray-300"/>
                                <label htmlFor="refund-credit" className="ml-3 block text-sm font-medium text-gray-700">Apply as Account Credit (Reduces customer balance)</label>
                            </div>
                            <div className="flex items-center mt-2">
                                <input id="refund-cash" name="refund-method" type="radio" checked={refundMethod === 'cash'} onChange={() => setRefundMethod('cash')} className="focus:ring-primary h-4 w-4 text-primary border-gray-300"/>
                                <label htmlFor="refund-cash" className="ml-3 block text-sm font-medium text-gray-700">Issue Cash/Bank Refund (Reduces shop cash)</label>
                            </div>
                            {refundMethod === 'cash' && (
                                <div className="pl-7 mt-2">
                                    <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Refund From Account</label>
                                    <select id="paymentAccount" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                        <option value="">Select an account</option>
                                        {currentShopAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                     </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-6 rounded-lg transition duration-300 disabled:opacity-50" disabled={totalReturnValue <= 0}>
                        Process Return
                    </button>
                </div>
            </form>
        </div>
    );
};

export default SalesReturn;