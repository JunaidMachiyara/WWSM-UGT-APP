
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  getDocs,
  writeBatch,
  setDoc,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { 
  User, 
  UserRole, 
  Shop, 
  Product, 
  Transaction, 
  TransactionType, 
  Shipment, 
  ShipmentStatus, 
  Alert, 
  AlertType, 
  Customer, 
  Warehouse, 
  ShopAccount, 
  Currency, 
  ClearingAgent, 
  FreightForwarder, 
  CustomExpenseType, 
  ExpenseAccount, 
  Asset, 
  AssetStatus,
  InvoiceSummary,
  ImportBatch,
  AccountType
} from '../types';

export interface OpeningStockPayload {
    shopId: string;
    productId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    date: Date;
    notes: string;
}

export interface BulkCustomerPayload {
    name: string;
    phone: string;
    reference: string;
    openingBalance: number; 
}

interface AppContextType {
  currentUser: User | null;
  role: UserRole | null;
  shopId: string | null;
  shops: Shop[];
  products: Product[];
  transactions: Transaction[];
  shipments: Shipment[];
  alerts: Alert[];
  customers: Customer[];
  warehouses: Warehouse[];
  shopAccounts: ShopAccount[];
  currencies: Currency[];
  clearingAgents: ClearingAgent[];
  freightForwarders: FreightForwarder[];
  customExpenseTypes: CustomExpenseType[];
  expenseAccounts: ExpenseAccount[];
  assets: Asset[];
  importBatches: ImportBatch[];
  currentShopCurrency: Currency;
  isDemoMode: boolean;
  connectionError: string | null;
  invoiceToEdit: InvoiceSummary | null;
  setInvoiceToEdit: (invoice: InvoiceSummary | null) => void;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchShop: (id: string | null) => void;
  addShop: (shop: Omit<Shop, 'id'>) => Promise<void>;
  updateShop: (id: string, data: Partial<Shop>) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'> & { openingBalance?: number }) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer> & { openingBalance?: number }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateSupplierOpeningBalance: (openingBalance: number) => Promise<void>;
  bulkAddCustomers: (payload: BulkCustomerPayload[]) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  standardizeItemIds: () => Promise<void>;
  bulkSyncProducts: (products: any[]) => Promise<Map<string, string>>;
  addShopAccount: (account: Omit<ShopAccount, 'id'>) => Promise<void>;
  updateShopAccount: (id: string, data: Partial<ShopAccount>) => Promise<void>;
  updateCurrency: (data: { id: string, rate: number }) => Promise<void>;
  addCurrency: (currency: Currency) => Promise<void>;
  recordSale: (payload: any) => Promise<void>;
  updateSale: (payload: any) => Promise<void>;
  deleteInvoice: (transactionIdsToDelete: string[]) => Promise<void>;
  recordPayment: (payload: any) => Promise<void>;
  addExpense: (payload: any) => Promise<void>;
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => Promise<void>;
  transferStock: (payload: any) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id' | 'status'>) => Promise<void>;
  recordAdvance: (payload: any) => Promise<void>;
  receiveShipment: (payload: any) => Promise<void>;
  addExport: (payload: any) => Promise<void>;
  updateShipmentCosts: (payload: any) => Promise<void>;
  recordPaymentVoucher: (payload: any) => Promise<void>;
  recordSalesReturn: (payload: any) => Promise<void>;
  addOpeningStock: (payload: OpeningStockPayload) => Promise<void>;
  bulkAddOpeningStock: (payload: OpeningStockPayload[], syncedProductsCount: number) => Promise<void>;
  deleteImportBatch: (batchId: string) => Promise<void>;
  purgeOpeningStock: (shopId: string) => Promise<void>;
  deleteStockTransactions: (itemsToDelete: { productId: string, locationId: string }[]) => Promise<void>;
  writeOffStock: (payload: { productId: string; locationId: string; quantity: number; notes: string; }) => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  logAlert: (alert: Omit<Alert, 'id' | 'isRead'>) => Promise<void>;
  resetSystem: () => Promise<void>;
  clearTransactions: () => Promise<void>;
  getStockLevel: (productId: string, locationId?: string) => number;
  getAdvanceBalance: (customerId: string) => number;
  formatCurrency: (amountInBase: number) => string;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addClearingAgent: (agent: Omit<ClearingAgent, 'id'>) => Promise<void>;
  addFreightForwarder: (ff: Omit<FreightForwarder, 'id'>) => Promise<void>;
  addCustomExpenseType: (type: Omit<CustomExpenseType, 'id'>) => Promise<void>;
  addExpenseAccount: (account: Omit<ExpenseAccount, 'id'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const safeDate = (data: any, field: string) => {
    if (data[field] && typeof data[field].toDate === 'function') return data[field].toDate();
    if (data[field] instanceof Date) return data[field];
    return new Date();
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shopAccounts, setShopAccounts] = useState<ShopAccount[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clearingAgents, setClearingAgents] = useState<ClearingAgent[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<FreightForwarder[]>([]);
  const [customExpenseTypes, setCustomExpenseTypes] = useState<CustomExpenseType[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [invoiceToEdit, setInvoiceToEdit] = useState<InvoiceSummary | null>(null);

  useEffect(() => {
    const options = { serverTimestamps: 'estimate' as const };
    const unsubShops = onSnapshot(collection(db, 'shops'), (s) => setShops(s.docs.map(d => ({ id: d.id, ...d.data() } as Shop))));
    const unsubProds = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (s) => setTransactions(s.docs.map(d => {
        const data = d.data(options);
        return { id: d.id, ...data, date: safeDate(data, 'date') } as Transaction;
    })));
    const unsubShip = onSnapshot(collection(db, 'shipments'), (s) => setShipments(s.docs.map(d => {
        const data = d.data(options);
        return { ...data, id: d.id, date: safeDate(data, 'date') } as Shipment;
    })));
    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (s) => setAlerts(s.docs.map(d => {
        const data = d.data(options);
        return { id: d.id, ...data, date: safeDate(data, 'date') } as Alert;
    })));
    const unsubCust = onSnapshot(collection(db, 'customers'), (s) => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
    const unsubWH = onSnapshot(collection(db, 'warehouses'), (s) => setWarehouses(s.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))));
    const unsubAcc = onSnapshot(collection(db, 'accounts'), (s) => setShopAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ShopAccount))));
    const unsubCurr = onSnapshot(collection(db, 'currencies'), (s) => setCurrencies(s.docs.map(d => ({ id: d.id, ...d.data() } as Currency))));
    const unsubClearing = onSnapshot(collection(db, 'clearingAgents'), (s) => setClearingAgents(s.docs.map(d => ({ id: d.id, ...d.data() } as ClearingAgent))));
    const unsubFreight = onSnapshot(collection(db, 'freightForwarders'), (s) => setFreightForwarders(s.docs.map(d => ({ id: d.id, ...d.data() } as FreightForwarder))));
    const unsubCustomExp = onSnapshot(collection(db, 'customExpenseTypes'), (s) => setCustomExpenseTypes(s.docs.map(d => ({ id: d.id, ...d.data() } as CustomExpenseType))));
    const unsubExpAcc = onSnapshot(collection(db, 'expenseAccounts'), (s) => setExpenseAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseAccount))));
    const unsubAssets = onSnapshot(collection(db, 'assets'), (s) => setAssets(s.docs.map(d => {
        const data = d.data(options);
        return { id: d.id, ...data, purchaseDate: safeDate(data, 'purchaseDate') } as Asset;
    })));
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as User))));
    const unsubBatches = onSnapshot(query(collection(db, 'importBatches'), orderBy('date', 'desc')), (s) => setImportBatches(s.docs.map(d => {
        const data = d.data(options);
        return { id: d.id, ...data, date: safeDate(data, 'date') } as ImportBatch;
    })));
    return () => {
      unsubShops(); unsubProds(); unsubTrans(); unsubShip(); unsubAlerts(); unsubCust(); 
      unsubWH(); unsubAcc(); unsubCurr(); unsubClearing(); unsubFreight(); unsubCustomExp();
      unsubExpAcc(); unsubAssets(); unsubUsers(); unsubBatches();
    };
  }, []);

  const currentShopCurrency = useMemo(() => {
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
    return currencies.find(c => c.id === shop.currencyCode) || { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
  }, [shopId, shops, currencies]);

  const login = useCallback(async (username: string, password?: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      setShopId(user.shopId || (user.allowedShopIds && user.allowedShopIds.length > 0 ? user.allowedShopIds[0] : null));
      return true;
    }
    if (username === 'admin' && password === 'admin123') {
        setCurrentUser({ id: 'admin-id', name: 'System Admin', username: 'admin', role: UserRole.HEAD_OFFICE });
        setRole(UserRole.HEAD_OFFICE);
        setShopId(null);
        return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => { setCurrentUser(null); setRole(null); setShopId(null); }, []);
  const switchShop = useCallback((id: string | null) => setShopId(id), []);
  const addShop = async (shop: Omit<Shop, 'id'>) => { await addDoc(collection(db, 'shops'), shop); };
  const updateShop = async (id: string, data: Partial<Shop>) => { await updateDoc(doc(db, 'shops', id), data); };
  const deleteShop = async (id: string) => { await deleteDoc(doc(db, 'shops', id)); };
  
  const addCustomer = async (payload: any) => { 
      const { openingBalance, ...customerData } = payload;
      const ref = await addDoc(collection(db, 'customers'), customerData); 
      if (openingBalance && openingBalance !== 0) {
          const rate = currentShopCurrency.rate || 1;
          await addDoc(collection(db, 'transactions'), {
              shopId: customerData.shopId, customerId: ref.id, invoiceId: 'OPENING-BAL',
              type: openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE,
              description: 'Opening Balance Setup', amount: Math.abs(openingBalance) / rate, date: serverTimestamp(),
          });
      }
  };

  const updateCustomer = async (id: string, data: any) => {
      const { openingBalance, ...customerData } = data;
      await updateDoc(doc(db, 'customers', id), customerData);
      if (openingBalance !== undefined) {
          const q = query(collection(db, 'transactions'), where('customerId', '==', id), where('invoiceId', '==', 'OPENING-BAL'));
          const snap = await getDocs(q);
          const rate = currentShopCurrency.rate || 1;
          const amountBase = Math.abs(openingBalance) / rate;
          const type = openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE;
          if (!snap.empty) {
              const transDoc = snap.docs[0];
              if (openingBalance === 0) await deleteDoc(transDoc.ref);
              else await updateDoc(transDoc.ref, { amount: amountBase, type: type });
          } else if (openingBalance !== 0) {
              await addDoc(collection(db, 'transactions'), {
                  shopId, customerId: id, invoiceId: 'OPENING-BAL', type, description: 'Opening Balance Correction',
                  amount: amountBase, date: serverTimestamp(),
              });
          }
      }
  };

  const deleteCustomer = async (id: string) => { 
      await deleteDoc(doc(db, 'customers', id)); 
      const q = query(collection(db, 'transactions'), where('customerId', '==', id), where('invoiceId', '==', 'OPENING-BAL'));
      const snap = await getDocs(q);
      if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
  };

  const updateSupplierOpeningBalance = async (openingBalance: number) => {
    if (!shopId) return;
    const q = query(collection(db, 'transactions'), where('shopId', '==', shopId), where('invoiceId', '==', 'HO-OPENING-BAL'));
    const snap = await getDocs(q);
    const rate = currentShopCurrency.rate || 1;
    const amountBase = openingBalance / rate;
    if (!snap.empty) {
        const transDoc = snap.docs[0];
        if (openingBalance === 0) await deleteDoc(transDoc.ref);
        else await updateDoc(transDoc.ref, { amount: amountBase, type: TransactionType.IMPORT, description: 'Supplier Opening Balance' });
    } else if (openingBalance !== 0) {
        await addDoc(collection(db, 'transactions'), {
            shopId, invoiceId: 'HO-OPENING-BAL', type: TransactionType.IMPORT, description: 'Supplier Opening Balance',
            amount: amountBase, date: serverTimestamp(),
        });
    }
  };

  const bulkAddCustomers = async (payload: BulkCustomerPayload[]) => {
      const batch = writeBatch(db);
      const rate = currentShopCurrency.rate || 1;
      payload.forEach(item => {
          const customerRef = doc(collection(db, 'customers'));
          batch.set(customerRef, { name: item.name, phone: item.phone, reference: item.reference, shopId: shopId });
          if (item.openingBalance !== 0) {
              const transRef = doc(collection(db, 'transactions'));
              batch.set(transRef, { 
                shopId, customerId: customerRef.id, invoiceId: 'OPENING-BAL', 
                type: item.openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE, 
                description: 'Opening Balance Migration', amount: Math.abs(item.openingBalance) / rate, date: serverTimestamp() 
              });
          }
      });
      await batch.commit();
  };

  const addProduct = async (productData: Omit<Product, 'id'>) => { 
      const itemsWithNewId = products.filter(p => p.id.startsWith('ITEM-'));
      let nextSeq = 1001;
      if (itemsWithNewId.length > 0) {
          const maxId = Math.max(...itemsWithNewId.map(p => parseInt(p.id.split('-')[1]) || 0));
          nextSeq = maxId + 1;
      }
      await setDoc(doc(db, 'products', `ITEM-${nextSeq}`), productData); 
  };
  
  const standardizeItemIds = async () => {
      const itemsToMigrate = products.filter(p => !p.id.startsWith('ITEM-'));
      if (itemsToMigrate.length === 0) return;
      let currentMax = 1000;
      products.filter(p => p.id.startsWith('ITEM-')).forEach(p => {
          const seq = parseInt(p.id.split('-')[1]) || 0;
          if (seq > currentMax) currentMax = seq;
      });
      const idMap: Record<string, string> = {};
      itemsToMigrate.forEach(item => { currentMax++; idMap[item.id] = `ITEM-${currentMax}`; });
      const transSnap = await getDocs(collection(db, 'transactions'));
      let batch = writeBatch(db);
      let opCount = 0;
      const commit = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0; } };
      for (const item of itemsToMigrate) {
          const { id, ...data } = item;
          batch.set(doc(db, 'products', idMap[item.id]), data);
          batch.delete(doc(db, 'products', item.id));
          opCount += 2; if (opCount >= 450) await commit();
      }
      for (const d of transSnap.docs) {
          if (d.data().productId && idMap[d.data().productId]) {
              batch.update(d.ref, { productId: idMap[d.data().productId] });
              opCount++; if (opCount >= 450) await commit();
          }
      }
      await commit();
  };

  const bulkSyncProducts = async (productsData: any[]): Promise<Map<string, string>> => {
    const processedNameToIdMap = new Map<string, string>(); 
    let currentMax = 1000;
    products.filter(p => p.id.startsWith('ITEM-')).forEach(p => {
        const seq = parseInt(p.id.split('-')[1]) || 0;
        if (seq > currentMax) currentMax = seq;
    });
    const CHUNK_SIZE = 450;
    for (let i = 0; i < productsData.length; i += CHUNK_SIZE) {
        const chunk = productsData.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);
        for (const p of chunk) {
            const lowercaseName = p.name.toLowerCase();
            let idToUse = p.id;
            if (!idToUse) {
                const existing = products.find(prod => prod.name.toLowerCase() === lowercaseName);
                if (existing) idToUse = existing.id;
                else { currentMax++; idToUse = `ITEM-${currentMax}`; }
            }
            processedNameToIdMap.set(lowercaseName, idToUse);
            const { id, ...cleanProduct } = p;
            batch.set(doc(db, 'products', idToUse), cleanProduct, { merge: true });
        }
        await batch.commit();
    }
    return processedNameToIdMap;
  };

  const addShopAccount = async (account: Omit<ShopAccount, 'id'>) => { await addDoc(collection(db, 'accounts'), account); };
  const updateShopAccount = async (id: string, data: Partial<ShopAccount>) => { await updateDoc(doc(db, 'accounts', id), data); };
  const updateCurrency = async (data: { id: string, rate: number }) => { await updateDoc(doc(db, 'currencies', data.id), { rate: data.rate }); };
  const addCurrency = async (currency: Currency) => { await setDoc(doc(db, 'currencies', currency.id), currency); };

  const getStockLevel = useCallback((productId: string, locationId?: string) => {
    let stock = 0;
    transactions.forEach(t => {
      if (t.productId === productId && (!locationId || t.locationId === locationId || (!t.locationId && locationId === t.shopId))) {
        if ([TransactionType.IMPORT, TransactionType.STOCK_TRANSFER_IN, TransactionType.SALES_RETURN, TransactionType.OPENING_STOCK].includes(t.type)) stock += (t.quantity || 0);
        else if ([TransactionType.CASH_SALE, TransactionType.CREDIT_SALE, TransactionType.STOCK_TRANSFER_OUT, TransactionType.STOCK_WRITE_OFF].includes(t.type)) stock -= (t.quantity || 0);
      }
    });
    return stock;
  }, [transactions]);

  const getAdvanceBalance = useCallback((customerId: string) => {
    let balance = 0;
    transactions.forEach(t => {
        if (t.customerId === customerId) {
            if (t.type === TransactionType.CUSTOMER_ADVANCE) balance += t.amount;
            if (t.type === TransactionType.ADVANCE_USAGE) balance -= t.amount;
        }
    });
    return balance;
  }, [transactions]);

  const formatCurrency = useCallback((amountInBase: number) => {
    const amount = amountInBase * (currentShopCurrency.rate || 1);
    return `${currentShopCurrency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currentShopCurrency]);

  const recordSale = async (payload: any) => {
      const batch = writeBatch(db);
      const rate = currentShopCurrency.rate || 1;
      const totalLocal = payload.items.reduce((s: number, i: any) => s + (i.salePrice * i.quantity), 0);
      const isCredit = (payload.cashPaid + payload.advanceApplied) < (totalLocal - 0.01);
      payload.items.forEach((item: any) => {
          const product = products.find(p => p.id === item.productId);
          if (product && item.salePrice < product.minSalePrice * rate) {
              batch.set(doc(collection(db, 'alerts')), { shopId: 'HO', type: AlertType.PRICE_VIOLATION, message: `Violation: ${product.name} sold low at ${shops.find(s => s.id === payload.shopId)?.name}`, date: serverTimestamp(), isRead: false, context: { invoiceId: payload.invoiceNumber, shopId: payload.shopId } });
          }
          batch.set(doc(collection(db, 'transactions')), { ...item, amount: item.salePrice / rate, type: isCredit ? TransactionType.CREDIT_SALE : TransactionType.CASH_SALE, shopId: payload.shopId, customerId: payload.customerId, invoiceId: payload.invoiceNumber, date: Timestamp.fromDate(payload.date) });
      });
      if (payload.cashPaid > 0) batch.set(doc(collection(db, 'transactions')), { shopId: payload.shopId, customerId: payload.customerId, type: TransactionType.SALES_RECEIPT, amount: payload.cashPaid / rate, paymentAccountId: payload.paymentAccountId, invoiceId: payload.invoiceNumber, date: Timestamp.fromDate(payload.date) });
      if (payload.advanceApplied > 0) batch.set(doc(collection(db, 'transactions')), { shopId: payload.shopId, customerId: payload.customerId, type: TransactionType.ADVANCE_USAGE, amount: payload.advanceApplied / rate, invoiceId: payload.invoiceNumber, date: Timestamp.fromDate(payload.date) });
      await batch.commit();
  };

  const updateSale = async (payload: any) => {
      const batch = writeBatch(db);
      payload.deletedTransactionIds.forEach((id: string) => batch.delete(doc(db, 'transactions', id)));
      await batch.commit();
      await recordSale(payload);
  };

  const deleteInvoice = async (ids: string[]) => {
      const batch = writeBatch(db);
      ids.forEach(id => batch.delete(doc(db, 'transactions', id)));
      await batch.commit();
  };

  const recordPayment = async (payload: any) => { await addDoc(collection(db, 'transactions'), { ...payload, amount: payload.amount / currentShopCurrency.rate, type: TransactionType.SALES_RECEIPT, date: Timestamp.fromDate(payload.date) }); };
  const addExpense = async (payload: any) => { await addDoc(collection(db, 'transactions'), { ...payload, amount: payload.amount / currentShopCurrency.rate, type: TransactionType.EXPENSE, date: Timestamp.fromDate(payload.date) }); };
  const addWarehouse = async (w: any) => { await addDoc(collection(db, 'warehouses'), w); };
  const transferStock = async (p: any) => {
      const batch = writeBatch(db);
      batch.set(doc(collection(db, 'transactions')), { ...p, type: TransactionType.STOCK_TRANSFER_OUT, locationId: p.fromLocationId, date: Timestamp.fromDate(p.date), amount: 0 });
      batch.set(doc(collection(db, 'transactions')), { ...p, type: TransactionType.STOCK_TRANSFER_IN, locationId: p.toLocationId, date: Timestamp.fromDate(p.date), amount: 0 });
      await batch.commit();
  };
  const addAsset = async (a: any) => {
      await addDoc(collection(db, 'assets'), { ...a, purchaseCost: a.purchaseCost / currentShopCurrency.rate, status: AssetStatus.ACTIVE, purchaseDate: Timestamp.fromDate(a.purchaseDate) });
      await addDoc(collection(db, 'transactions'), { shopId: a.shopId, type: TransactionType.EXPENSE, amount: a.purchaseCost / currentShopCurrency.rate, paymentAccountId: a.paymentAccountId, expenseAccountId: a.expenseAccountId, description: `Asset: ${a.name}`, date: Timestamp.fromDate(a.purchaseDate) });
  };
  const recordAdvance = async (p: any) => { await addDoc(collection(db, 'transactions'), { ...p, amount: p.amount / currentShopCurrency.rate, type: TransactionType.CUSTOMER_ADVANCE, date: Timestamp.fromDate(p.date) }); };

  const receiveShipment = async (payload: any) => {
      const shipment = shipments.find(s => s.id === payload.shipmentId);
      if (!shipment) return;
      const batch = writeBatch(db);
      batch.update(doc(db, 'shipments', payload.shipmentId), { status: ShipmentStatus.RECEIVED, receivedItems: payload.receivedItems });
      payload.receivedItems.forEach((ri: any) => {
          const item = shipment.items.find(si => si.productId === ri.productId);
          if (item) batch.set(doc(collection(db, 'transactions')), { shopId: shipment.shopId, productId: ri.productId, quantity: ri.quantity, amount: item.landedCost, type: TransactionType.IMPORT, date: serverTimestamp(), locationId: payload.locationId });
      });
      await batch.commit();
  };

  const addExport = async (p: any) => { await setDoc(doc(db, 'shipments', p.shipmentId), { ...p, date: serverTimestamp(), status: ShipmentStatus.PENDING }); };
  const updateShipmentCosts = async (p: any) => { const { shipmentId, ...costs } = p; await updateDoc(doc(db, 'shipments', shipmentId), costs); };
  const recordPaymentVoucher = async (p: any) => { await addDoc(collection(db, 'transactions'), { ...p, amount: p.amount / (p.shopId === 'HO' ? 1 : currentShopCurrency.rate), type: TransactionType.EXPENSE, date: Timestamp.fromDate(p.date) }); };
  const recordSalesReturn = async (p: any) => {
      const batch = writeBatch(db);
      const rate = currentShopCurrency.rate || 1;
      p.returnedItems.forEach((i: any) => batch.set(doc(collection(db, 'transactions')), { shopId: p.shopId, customerId: p.customerId, productId: i.productId, quantity: i.quantity, amount: i.salePrice / rate, type: TransactionType.SALES_RETURN, date: Timestamp.fromDate(p.date), locationId: p.locationId }));
      if (p.refundMethod === 'cash') batch.set(doc(collection(db, 'transactions')), { shopId: p.shopId, type: TransactionType.EXPENSE, amount: p.returnedItems.reduce((s:number, i:any) => s+(i.quantity*i.salePrice), 0) / rate, paymentAccountId: p.paymentAccountId, date: Timestamp.fromDate(p.date) });
      await batch.commit();
  };

  const addOpeningStock = async (p: any) => { await addDoc(collection(db, 'transactions'), { ...p, amount: p.unitCost / currentShopCurrency.rate, type: TransactionType.OPENING_STOCK, date: Timestamp.fromDate(p.date) }); };
  
  const bulkAddOpeningStock = async (p: OpeningStockPayload[], syncedCount: number) => {
    const batch = writeBatch(db);
    const batchId = doc(collection(db, 'temp')).id;
    p.forEach(item => { 
        const { unitCost, ...transactionData } = item;
        batch.set(doc(collection(db, 'transactions')), { 
            ...transactionData, 
            amount: unitCost, 
            importBatchId: batchId, 
            type: TransactionType.OPENING_STOCK, 
            date: serverTimestamp() 
        }); 
    });
    batch.set(doc(db, 'importBatches', batchId), { shopId: p[0].shopId, itemCount: p.length, syncedProducts: syncedCount, date: serverTimestamp() });
    await batch.commit();
  };

  const deleteImportBatch = async (id: string) => {
      const q = query(collection(db, 'transactions'), where('importBatchId', '==', id));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      batch.delete(doc(db, 'importBatches', id));
      await batch.commit();
  };

  const purgeOpeningStock = async (sid: string) => {
      const q = query(collection(db, 'transactions'), where('shopId', '==', sid), where('type', '==', TransactionType.OPENING_STOCK));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
  };

  const deleteStockTransactions = async (items: { productId: string, locationId: string }[]) => {
      if (!shopId) return;
      const CHUNK_SIZE = 450;
      for (const item of items) {
          // Use a simpler query (shop + product) and filter locally to avoid indexing hangs
          const q = query(
              collection(db, 'transactions'), 
              where('shopId', '==', shopId),
              where('productId', '==', item.productId)
          );
          const snap = await getDocs(q);
          // Filter locally to find matches for location
          const matches = snap.docs.filter(d => {
              const data = d.data();
              const loc = data.locationId || data.shopId; // normalize
              return loc === item.locationId;
          });

          for (let i = 0; i < matches.length; i += CHUNK_SIZE) {
              const chunk = matches.slice(i, i + CHUNK_SIZE);
              const batch = writeBatch(db);
              chunk.forEach(d => batch.delete(d.ref));
              await batch.commit();
          }
      }
  };

  const writeOffStock = async (p: any) => { await addDoc(collection(db, 'transactions'), { ...p, type: TransactionType.STOCK_WRITE_OFF, date: serverTimestamp(), amount: 0 }); };
  const markAlertAsRead = async (id: string) => { await updateDoc(doc(db, 'alerts', id), { isRead: true }); };
  const logAlert = async (a: any) => { await addDoc(collection(db, 'alerts'), { ...a, isRead: false, date: serverTimestamp() }); };

  const resetSystem = async () => {
      const colls = ['shops', 'products', 'transactions', 'shipments', 'alerts', 'customers', 'warehouses', 'accounts', 'currencies', 'users', 'importBatches'];
      for (const c of colls) {
          const snap = await getDocs(collection(db, c));
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
      window.location.reload();
  };

  const clearTransactions = async () => {
      const snap = await getDocs(collection(db, 'transactions'));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
  };

  const addUser = async (u: any) => { await addDoc(collection(db, 'users'), u); };
  const updateUser = async (id: string, d: any) => { await updateDoc(doc(db, 'users', id), d); };
  const deleteUser = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };

  const value = {
    currentUser, role, shopId, shops, products, transactions, shipments, alerts, customers, warehouses,
    shopAccounts, currencies, clearingAgents: [], freightForwarders: [], customExpenseTypes: [], expenseAccounts, assets,
    importBatches, currentShopCurrency, isDemoMode: false, connectionError: null, invoiceToEdit, setInvoiceToEdit, login, logout, switchShop, addShop, updateShop, deleteShop,
    addCustomer, updateCustomer, deleteCustomer, updateSupplierOpeningBalance, bulkAddCustomers, addProduct, standardizeItemIds, bulkSyncProducts, addShopAccount, updateShopAccount, updateCurrency, addCurrency, recordSale, updateSale, deleteInvoice, recordPayment,
    addExpense, addWarehouse, transferStock, addAsset, recordAdvance, receiveShipment, addExport, updateShipmentCosts,
    recordPaymentVoucher, recordSalesReturn, addOpeningStock, bulkAddOpeningStock, deleteImportBatch, purgeOpeningStock, deleteStockTransactions, writeOffStock, markAlertAsRead, logAlert,
    resetSystem, clearTransactions, getStockLevel, getAdvanceBalance, formatCurrency, users, addUser, updateUser,
    deleteUser, addClearingAgent: async (a: any) => { await addDoc(collection(db, 'clearingAgents'), a); }, 
    addFreightForwarder: async (f: any) => { await addDoc(collection(db, 'freightForwarders'), f); }, 
    addCustomExpenseType: async (t: any) => { await addDoc(collection(db, 'customExpenseTypes'), t); }, 
    addExpenseAccount: async (a: any) => { await addDoc(collection(db, 'expenseAccounts'), a); }
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
