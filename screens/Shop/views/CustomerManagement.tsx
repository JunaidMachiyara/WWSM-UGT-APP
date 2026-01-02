
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { BulkCustomerPayload } from '../../../context/AppContext';
import { Customer, TransactionType } from '../../../types';

type SortField = 'name' | 'balance';
type SortDirection = 'asc' | 'desc';

interface CustomerWithBalance extends Customer {
    calculatedBalance: number;
    openingBalanceValue: number;
}

const CustomerManagement: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer, bulkAddCustomers, shopId, currentShopCurrency, formatCurrency, transactions } = useAppContext();
  
  // Manual Entry / Edit State
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [reference, setReference] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);

  // Deletion State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [securityPin, setSecurityPin] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Bulk Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<BulkCustomerPayload[]>([]);
  const [csvError, setCsvError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  // 1. Pre-calculate all balances for the current shop to allow sorting
  const customersWithBalances = useMemo(() => {
    const shopTrans = transactions.filter(t => t.shopId === shopId);
    
    return customers
        .filter(c => c.shopId === shopId)
        .map(customer => {
            // Calculate Current Balance in BASE CURRENCY (USD)
            let currentBalBase = 0;
            shopTrans.filter(t => t.customerId === customer.id).forEach(t => {
                const val = (t.amount * (t.quantity || 1));
                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) currentBalBase += val;
                else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.ADVANCE_USAGE) {
                    currentBalBase -= (t.type === TransactionType.SALES_RETURN ? val : t.amount);
                } else if (t.type === TransactionType.CUSTOMER_ADVANCE) {
                    currentBalBase -= t.amount;
                }
            });

            // Calculate Opening Balance Identity in LOCAL CURRENCY for the edit form
            const ot = shopTrans.find(t => t.customerId === customer.id && t.invoiceId === 'OPENING-BAL');
            let opValLocal = 0;
            if (ot) {
                const baseVal = ot.amount * currentShopCurrency.rate;
                opValLocal = ot.type === TransactionType.CUSTOMER_ADVANCE ? -baseVal : baseVal;
            }

            return {
                ...customer,
                calculatedBalance: currentBalBase, // Keep this in USD Base
                openingBalanceValue: opValLocal
            } as CustomerWithBalance;
        });
  }, [customers, transactions, shopId, currentShopCurrency]);

  // 2. Sort the calculated data
  const sortedCustomers = useMemo(() => {
    const data = [...customersWithBalances];
    return data.sort((a, b) => {
        let valA: string | number;
        let valB: string | number;

        if (sortField === 'name') {
            valA = a.name.toLowerCase();
            valB = b.name.toLowerCase();
        } else {
            valA = a.calculatedBalance;
            valB = b.calculatedBalance;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
  }, [customersWithBalances, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
      if (sortField === field) {
          setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDirection('asc');
      }
  };

  const handleEditClick = (customer: CustomerWithBalance) => {
      setEditingCustomer(customer);
      setName(customer.name);
      setPhone(customer.phone || '');
      setReference(customer.reference || '');
      // Edit form needs the LOCAL value
      setOpeningBalance(parseFloat(customer.openingBalanceValue.toFixed(2)));
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingCustomer(null);
      setName('');
      setPhone('');
      setReference('');
      setOpeningBalance(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!name || !shopId) return;

    const customerData = {
        name,
        phone,
        reference,
        shopId,
        openingBalance: Number(openingBalance) || 0
    };

    try {
        if (editingCustomer) {
            await updateCustomer(editingCustomer.id, customerData);
            setImportSuccess(`Customer "${name}" updated successfully.`);
        } else {
            await addCustomer(customerData);
            setImportSuccess(`Customer "${name}" created successfully.`);
        }
        cancelEdit();
        setTimeout(() => setImportSuccess(''), 3000);
    } catch (err: any) {
        setCsvError(`Failed to save customer: ${err.message}`);
    }
  };

  const handleDeleteInitiated = (id: string) => {
      setDeletingId(id);
      setSecurityPin('');
      setDeleteError('');
  };

  const handleConfirmDelete = async () => {
    if (securityPin !== '7860') {
        setDeleteError('Incorrect Security PIN. Access Denied.');
        return;
    }

    if (!deletingId) return;

    setIsDeleting(true);
    try {
        await deleteCustomer(deletingId);
        setDeletingId(null);
        setImportSuccess('Customer successfully removed from database.');
        setTimeout(() => setImportSuccess(''), 3000);
    } catch (e: any) {
        setDeleteError(`Deletion failed: ${e.message}`);
    } finally {
        setIsDeleting(false);
    }
  };

  const downloadTemplate = () => {
      const headers = ['Name', 'Phone', 'Reference', 'Opening Balance'];
      const rows = [
          ['John Doe', '077000000', 'Loyal Customer', '50.00'],
          ['Jane Smith', '078000000', 'Prepaid Balance', '-25.50']
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "customer_import_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCsvError('');
      setImportSuccess('');
      if (e.target.files && e.target.files[0]) {
          setCsvFile(e.target.files[0]);
          parseCSV(e.target.files[0]);
      }
  };

  const parseCSV = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          const lines = text.split('\n');
          if (lines.length < 2) {
              setCsvError('File appears empty.');
              return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const nameIdx = headers.indexOf('name');
          const phoneIdx = headers.indexOf('phone');
          const refIdx = headers.indexOf('reference');
          const balIdx = headers.indexOf('opening balance');

          if (nameIdx === -1) {
              setCsvError('Missing required column: Name');
              return;
          }

          const parsed: BulkCustomerPayload[] = [];
          let errorLines = 0;

          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cols = line.split(',').map(c => c.trim());
              const nameValue = cols[nameIdx];
              const phoneValue = phoneIdx !== -1 ? cols[phoneIdx] : '';
              const refValue = refIdx !== -1 ? cols[refIdx] : '';
              const balValue = balIdx !== -1 ? parseFloat(cols[balIdx]) : 0;

              if (nameValue) {
                  parsed.push({
                      name: nameValue,
                      phone: phoneValue,
                      reference: refValue,
                      openingBalance: isNaN(balValue) ? 0 : balValue
                  });
              } else {
                  errorLines++;
              }
          }

          if (parsed.length === 0) {
              setCsvError('No valid customer names found.');
          } else {
              setCsvPreviewData(parsed);
              if (errorLines > 0) {
                  setCsvError(`${errorLines} rows skipped due to missing names.`);
              }
          }
      };
      reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      if (csvPreviewData.length === 0) return;
      
      setIsImporting(true);
      try {
          await bulkAddCustomers(csvPreviewData);
          setImportSuccess(`Migration Complete: ${csvPreviewData.length} customers imported. Opening balances posted to AR and Advance ledgers.`);
          setCsvFile(null);
          setCsvPreviewData([]);
          const fileInput = document.getElementById('customerCsvInput') as HTMLInputElement;
          if(fileInput) fileInput.value = '';
      } catch (e: any) {
          setCsvError(`Import failed: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return (
        <span className="ml-1.5 inline-block animate-bounce-slow">
            {sortDirection === 'asc' ? '↑' : '↓'}
        </span>
    );
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Entry / Edit Form */}
        <div className={`lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit border ${editingCustomer ? 'border-primary ring-1 ring-primary/20' : 'border-gray-100'}`}>
            <h3 className="text-xl font-bold mb-4 text-gray-800 uppercase italic tracking-tighter">
                {editingCustomer ? 'Edit Customer Profile' : 'Add Single Customer'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="customerName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Customer Name</label>
                <input 
                type="text" 
                id="customerName" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
                required 
                />
            </div>
            <div>
                <label htmlFor="customerPhone" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</label>
                <input 
                type="text" 
                id="customerPhone" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                />
            </div>
            <div>
                <label htmlFor="customerReference" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Account Reference</label>
                <input 
                type="text" 
                id="customerReference" 
                value={reference} 
                onChange={e => setReference(e.target.value)} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                placeholder="e.g. Contractor, Walk-in"
                />
            </div>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                <label htmlFor="openingBal" className="block text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 italic">Starting (Opening) Balance</label>
                <div className="flex items-center">
                    <span className="mr-2 text-gray-400 font-bold">{currentShopCurrency.symbol}</span>
                    <input 
                        type="number" 
                        id="openingBal" 
                        value={openingBalance} 
                        onChange={e => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary font-black"
                        step="0.01"
                    />
                </div>
                <p className="text-[9px] text-gray-400 mt-2 font-bold leading-tight">POSITIVE = They owe you (Receivable)<br/>NEGATIVE = You owe them (Advance)</p>
            </div>
            <div className="space-y-2 pt-2">
                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 px-4 rounded-lg transition-all shadow-md uppercase tracking-widest text-sm">
                    {editingCustomer ? 'Update Ledger' : 'Save Customer'}
                </button>
                {editingCustomer && (
                    <button type="button" onClick={cancelEdit} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-2 px-4 rounded-lg transition-all uppercase tracking-widest text-[10px]">Cancel Edit</button>
                )}
            </div>
            </form>
        </div>

        {/* Bulk Import Section */}
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-800 uppercase italic tracking-tighter">Bulk Migration Utility</h3>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Auto-calculates ledger opening entries (JVs) in base currency.</p>
                </div>
                <button 
                    onClick={downloadTemplate}
                    className="text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-black py-2 px-4 rounded-lg border border-blue-200 flex items-center uppercase tracking-widest transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Template
                </button>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 mb-6 hover:bg-gray-100/50 transition-colors">
                <input 
                    type="file" 
                    id="customerCsvInput"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                />
                <label htmlFor="customerCsvInput" className="cursor-pointer flex flex-col items-center justify-center group">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </div>
                    <span className="text-primary font-black text-sm uppercase tracking-widest hover:underline italic">Select CSV for Migration</span>
                </label>
                {csvFile && <p className="mt-4 text-xs font-black text-gray-800 bg-white inline-block px-4 py-1 rounded-full shadow-sm border border-gray-100">Manifest: {csvFile.name}</p>}
            </div>

            {csvError && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-xs font-bold border border-red-100">{csvError}</div>}
            {importSuccess && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100 animate-pulse">{importSuccess}</div>}

            {csvPreviewData.length > 0 && (
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-4">
                        <h4 className="font-black text-xs text-gray-500 uppercase tracking-widest italic">Sync Preview ({csvPreviewData.length} entries)</h4>
                        <button 
                            onClick={handleBulkImport} 
                            disabled={isImporting}
                            className="bg-green-600 hover:bg-green-700 text-white font-black py-2 px-6 rounded-lg flex items-center disabled:opacity-50 text-[10px] uppercase tracking-widest shadow-lg transition-all"
                        >
                            {isImporting ? 'Processing Ledgers...' : 'Confirm & Sync'}
                        </button>
                    </div>
                    <div className="flex-1 max-h-48 overflow-y-auto border border-gray-100 rounded-xl shadow-inner bg-white custom-scrollbar">
                        <table className="min-w-full divide-y divide-gray-200 text-[11px]">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left font-black text-gray-400 uppercase tracking-widest">Name</th>
                                    <th className="px-4 py-2 text-right font-black text-gray-400 uppercase tracking-widest">Opening</th>
                                    <th className="px-4 py-2 text-center font-black text-gray-400 uppercase tracking-widest">Effect</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {csvPreviewData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2 text-gray-900 font-bold">{item.name}</td>
                                        <td className={`px-4 py-2 text-right font-black ${item.openingBalance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {currentShopCurrency.symbol}{item.openingBalance.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-2 text-center font-bold text-gray-400 uppercase tracking-tighter">
                                            {item.openingBalance > 0 ? 'Receivable' : item.openingBalance < 0 ? 'Advance' : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <div className="flex items-center justify-between mb-6 border-b-4 border-primary/10 pb-2">
            <h3 className="text-xl font-bold text-gray-800 uppercase italic tracking-tighter">
                Shop Customer Database ({sortedCustomers.length})
            </h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Click headers to sort</p>
        </div>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                    onClick={() => toggleSort('name')}
                    className={`px-6 py-4 text-left text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors hover:bg-blue-100/50 ${sortField === 'name' ? 'text-primary bg-blue-50' : 'text-gray-400'}`}
                >
                    Customer Identity <SortIndicator field="name" />
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Starting Bal</th>
                <th 
                    onClick={() => toggleSort('balance')}
                    className={`px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest cursor-pointer transition-colors hover:bg-blue-100/50 ${sortField === 'balance' ? 'text-primary bg-blue-50' : 'text-gray-400'}`}
                >
                    Current Balance <SortIndicator field="balance" />
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {sortedCustomers.map(customer => {
                  const currentBalBase = customer.calculatedBalance;
                  return (
                    <tr key={customer.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-black text-gray-900">{customer.name}</div>
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{customer.reference || 'Regular Account'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{customer.phone || <span className="text-gray-200 italic">Unlisted</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <span className={`font-bold ${customer.openingBalanceValue >= 0 ? 'text-gray-400' : 'text-green-500'}`}>
                            {currentShopCurrency.symbol}{customer.openingBalanceValue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right bg-gray-50/30">
                        <div className={`text-sm font-black ${currentBalBase > 0.01 ? 'text-red-600' : currentBalBase < -0.01 ? 'text-green-600' : 'text-gray-400'}`}>
                            {/* FIXED: Passing USD Base amount directly to formatCurrency */}
                            {formatCurrency(currentBalBase)}
                        </div>
                        <div className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">{currentBalBase > 0.01 ? 'Receivable' : currentBalBase < -0.01 ? 'Prepaid' : 'Settled'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all duration-300">
                            <button 
                                onClick={() => handleEditClick(customer)}
                                className="bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                                Edit
                            </button>
                            <button 
                                onClick={() => handleDeleteInitiated(customer.id)}
                                className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                                Delete
                            </button>
                        </div>
                    </td>
                    </tr>
                );
              })}
              {sortedCustomers.length === 0 && (
                  <tr>
                      <td colSpan={5} className="text-center py-24 text-gray-300 italic font-bold">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          No customers found in database.
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secure Deletion Modal */}
      {deletingId && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-up">
                  <div className="bg-red-600 p-6 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </div>
                      <h3 className="text-xl font-black uppercase tracking-tighter italic">Secure Authorization</h3>
                      <p className="text-xs font-bold text-red-100 uppercase tracking-widest mt-1">Permanent Deletion Protocol</p>
                  </div>
                  <div className="p-8">
                      <p className="text-sm text-gray-500 font-medium mb-6 text-center">Enter the Master Security PIN to confirm the permanent removal of this customer.</p>
                      
                      <div className="space-y-4">
                          <input 
                              type="password" 
                              value={securityPin}
                              onChange={e => setSecurityPin(e.target.value)}
                              placeholder="Master PIN"
                              autoFocus
                              className="w-full text-center text-3xl font-black tracking-[0.5em] border-4 border-gray-100 bg-gray-50 rounded-xl py-3 focus:border-red-500 focus:bg-white outline-none transition-all"
                          />
                          {deleteError && <p className="text-[10px] text-red-600 font-black text-center uppercase animate-bounce">{deleteError}</p>}
                          
                          <div className="flex space-x-3 pt-4">
                              <button 
                                  onClick={() => setDeletingId(null)}
                                  disabled={isDeleting}
                                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                              >
                                  Abort
                              </button>
                              <button 
                                  onClick={handleConfirmDelete}
                                  disabled={isDeleting || securityPin.length < 4}
                                  className={`flex-1 py-3 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${isDeleting || securityPin.length < 4 ? 'bg-gray-300' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}
                              >
                                  {isDeleting ? 'Erasing...' : 'Erase Account'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default CustomerManagement;
