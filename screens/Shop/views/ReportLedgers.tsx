
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, ShipmentStatus, AccountType } from '../../../types';

interface LedgerEntry {
    id: string;
    date: Date;
    description: string;
    debit: number;  // Meaning changes based on account type context (Asset vs Liability)
    credit: number; // Meaning changes based on account type context
    balance: number;
    isOpening?: boolean;
}

interface LedgerTableProps { 
    entries: LedgerEntry[]; 
    finalBalance: number; 
    formatCurrency: (val:number) => string;
    debitLabel?: string;
    creditLabel?: string;
}

// --- Clearing Agent Ledger ---
export const ClearingAgentLedger: React.FC = () => {
    const { shopId, clearingAgents, shipments, transactions, formatCurrency } = useAppContext();
    const [selectedAgentId, setSelectedAgentId] = useState('');

    const entries = useMemo(() => {
        if (!selectedAgentId) return [];
        const agent = clearingAgents.find(a => a.id === selectedAgentId);
        
        // 1. Bills from Shipments (Liability Increases -> Credit)
        const bills = shipments
            .filter(s => s.shopId === shopId && s.clearingAgentId === selectedAgentId && (s.status === ShipmentStatus.RECEIVED || s.status === ShipmentStatus.PENDING))
            .map(s => ({
                id: s.id,
                date: s.date,
                description: `Clearing Services - Shipment #${s.id}`,
                debit: 0,
                credit: s.clearingCost,
                balance: 0,
            }));

        // 2. Payments from Expenses (Liability Decreases -> Debit)
        const payments = transactions
            .filter(t => t.shopId === shopId && t.type === TransactionType.EXPENSE && agent && t.description.toLowerCase().includes(agent.name.toLowerCase()))
            .map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                debit: t.amount,
                credit: 0,
                balance: 0,
            }));

        const all = [...bills, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        return all.map(e => {
            runningBalance += e.credit - e.debit; // Liability increases with Credit (Bill), decreases with Debit (Payment)
            return { ...e, balance: runningBalance };
        });

    }, [selectedAgentId, shipments, transactions, shopId, clearingAgents]);

    const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Clearing Agent Report</h2>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Clearing Agent</label>
                <select 
                    value={selectedAgentId} 
                    onChange={e => setSelectedAgentId(e.target.value)} 
                    className="block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:ring-primary"
                >
                    <option value="">-- Select Agent --</option>
                    {clearingAgents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {selectedAgentId && (
                <LedgerTable 
                    entries={entries} 
                    finalBalance={balance} 
                    formatCurrency={formatCurrency} 
                    debitLabel="Payment (Debit)"
                    creditLabel="Bill (Credit)"
                />
            )}
        </div>
    );
};

// --- Customs Ledger ---
export const CustomsLedger: React.FC = () => {
    const { shopId, customExpenseTypes, shipments, transactions, formatCurrency } = useAppContext();
    const [selectedTypeId, setSelectedTypeId] = useState('');

    const entries = useMemo(() => {
        if (!selectedTypeId) return [];
        const type = customExpenseTypes.find(t => t.id === selectedTypeId);

        const bills = shipments
            .filter(s => s.shopId === shopId && s.customExpenseTypeId === selectedTypeId && (s.status === ShipmentStatus.RECEIVED || s.status === ShipmentStatus.PENDING))
            .map(s => ({
                id: s.id,
                date: s.date,
                description: `Custom Charges - Shipment #${s.id}`,
                debit: 0,
                credit: s.customExpenseCost,
                balance: 0,
            }));

        const payments = transactions
            .filter(t => t.shopId === shopId && t.type === TransactionType.EXPENSE && type && t.description.toLowerCase().includes(type.name.toLowerCase()))
            .map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                debit: t.amount,
                credit: 0,
                balance: 0,
            }));

        const all = [...bills, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        return all.map(e => {
            runningBalance += e.credit - e.debit;
            return { ...e, balance: runningBalance };
        });

    }, [selectedTypeId, shipments, transactions, shopId, customExpenseTypes]);

    const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Customs Report</h2>
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Expense Type</label>
                <select 
                    value={selectedTypeId} 
                    onChange={e => setSelectedTypeId(e.target.value)} 
                    className="block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:ring-primary"
                >
                    <option value="">-- Select Expense Type --</option>
                    {customExpenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            {selectedTypeId && (
                 <LedgerTable 
                    entries={entries} 
                    finalBalance={balance} 
                    formatCurrency={formatCurrency} 
                    debitLabel="Payment (Debit)"
                    creditLabel="Bill (Credit)"
                 />
            )}
        </div>
    );
};

// --- Duty Ledger ---
export const DutyLedger: React.FC = () => {
    const { shopId, shipments, transactions, formatCurrency } = useAppContext();

    const entries = useMemo(() => {
        const bills = shipments
            .filter(s => s.shopId === shopId && s.expectedDuty > 0 && (s.status === ShipmentStatus.RECEIVED || s.status === ShipmentStatus.PENDING))
            .map(s => ({
                id: s.id,
                date: s.date,
                description: `Duty Payable - Shipment #${s.id}`,
                debit: 0,
                credit: s.expectedDuty,
                balance: 0,
            }));

        const payments = transactions
            .filter(t => t.shopId === shopId && t.type === TransactionType.EXPENSE && t.description.toLowerCase().includes('duty'))
            .map(t => ({
                id: t.id,
                date: t.date,
                description: t.description,
                debit: t.amount,
                credit: 0,
                balance: 0,
            }));

        const all = [...bills, ...payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let runningBalance = 0;
        return all.map(e => {
            runningBalance += e.credit - e.debit;
            return { ...e, balance: runningBalance };
        });

    }, [shipments, transactions, shopId]);

    const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Duty Report (Revenue Authority)</h2>
            <LedgerTable 
                entries={entries} 
                finalBalance={balance} 
                formatCurrency={formatCurrency} 
                debitLabel="Payment (Debit)"
                creditLabel="Bill (Credit)"
            />
        </div>
    );
};


// --- Generic Account Ledger (Cash & Bank) ---
// For Asset Accounts:
// Debit = Increase (Receipts)
// Credit = Decrease (Payments)

const AccountLedger: React.FC<{ accountType: AccountType, title: string }> = ({ accountType, title }) => {
    const { shopId, shopAccounts, transactions, formatCurrency } = useAppContext();
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const filteredAccounts = shopAccounts.filter(a => a.shopId === shopId && a.accountType === accountType);

    const entries = useMemo(() => {
        if (!selectedAccountId) return [];
        const account = filteredAccounts.find(a => a.id === selectedAccountId);
        if (!account) return [];

        let runningBalance = account.openingBalance;

        // Initial Opening Balance Entry
        const initialEntry: LedgerEntry = {
            id: 'opening',
            date: new Date(0), // Displayed specially
            description: 'Opening Balance',
            debit: 0,
            credit: 0,
            balance: runningBalance,
            isOpening: true
        };

        const accountTransactions = transactions.filter(t => t.shopId === shopId && t.paymentAccountId === selectedAccountId)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const mappedEntries = accountTransactions.map(t => {
            let debit = 0;
            let credit = 0;

            // Money In (Debit for Asset)
            if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) {
                debit = t.amount;
            }
            // Money Out (Credit for Asset)
            else if (t.type === TransactionType.EXPENSE) {
                credit = t.amount;
            }

            runningBalance = runningBalance + debit - credit;

            return {
                id: t.id,
                date: t.date,
                description: t.description,
                debit,
                credit,
                balance: runningBalance,
            };
        });

        return [initialEntry, ...mappedEntries];
    }, [selectedAccountId, transactions, shopId, filteredAccounts]);

    const balance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">{title}</h2>
             <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Account</label>
                <select 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)} 
                    className="block w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:ring-primary"
                >
                    <option value="">-- Select Account --</option>
                    {filteredAccounts.map(a => <option key={a.id} value={a.id}>{a.accountName}</option>)}
                </select>
            </div>
            {selectedAccountId && (
                 <LedgerTable 
                    entries={entries} 
                    finalBalance={balance} 
                    formatCurrency={formatCurrency} 
                    debitLabel="Receipt (Debit)"
                    creditLabel="Payment (Credit)"
                 />
            )}
        </div>
    );
};

export const CashLedger: React.FC = () => <AccountLedger accountType={AccountType.CASH} title="Cash Account Ledgers" />;
export const BankLedger: React.FC = () => <AccountLedger accountType={AccountType.BANK} title="Bank Account Ledgers" />;


// Helper Component for Tables
const LedgerTable: React.FC<LedgerTableProps> = ({ entries, finalBalance, formatCurrency, debitLabel = "Debit", creditLabel = "Credit" }) => {
    return (
        <div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 flex justify-between items-end">
                <div>
                    <p className="text-sm font-medium text-gray-600">Current Balance</p>
                    <p className={`text-2xl font-bold ${finalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(finalBalance)}</p>
                </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{debitLabel}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{creditLabel}</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {entries.length > 0 ? entries.map((entry, index) => (
                            <tr key={index} className={entry.isOpening ? 'bg-gray-50 font-medium' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {entry.isOpening ? '-' : new Date(entry.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">{entry.debit > 0 ? formatCurrency(entry.debit) : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">{entry.credit > 0 ? formatCurrency(entry.credit) : '-'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">{formatCurrency(entry.balance)}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-10 text-gray-500">No transactions found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
