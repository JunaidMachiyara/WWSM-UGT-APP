
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
  orderBy
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
  AssetStatus 
} from '../types';

export interface SaleItem {
    productId: string;
    quantity: number;
    salePrice: number;
    locationId?: string;
}

export interface ReceivedExtraItem {
    productId: string;
    quantity: number;
    unitCost: number;
    notes?: string;
}

export interface OpeningStockPayload {
    shopId: string;
    productId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    date: Date;
    notes: string;
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
  currentShopCurrency: Currency;
  isDemoMode: boolean;
  connectionError: string | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchShop: (id: string | null) => void;
  addShop: (shop: Omit<Shop, 'id'>) => Promise<void>;
  updateShop: (id: string, data: Partial<Shop>) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  bulkAddProducts: (products: Omit<Product, 'id'>[]) => Promise<void>;
  addShopAccount: (account: Omit<ShopAccount, 'id'>) => Promise<void>;
  updateCurrency: (data: { id: string, rate: number }) => Promise<void>;
  addCurrency: (currency: Currency) => Promise<void>;
  recordSale: (payload: any) => Promise<void>;
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
  bulkAddOpeningStock: (payload: OpeningStockPayload[]) => Promise<void>;
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
  const [users, setUsers] = useState<User[]>([]);
  const [isDemoMode] = useState(false);
  const [connectionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, 'shops'), (s) => setShops(s.docs.map(d => ({ id: d.id, ...d.data() } as Shop))));
    const unsubProds = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data(), date: (d.data().date as any).toDate() } as Transaction))));
    const unsubShip = onSnapshot(collection(db, 'shipments'), (s) => setShipments(s.docs.map(d => ({ id: d.id, ...d.data(), date: (d.data().date as any).toDate() } as Shipment))));
    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (s) => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data(), date: (d.data().date as any).toDate() } as Alert))));
    const unsubCust = onSnapshot(collection(db, 'customers'), (s) => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
    const unsubWH = onSnapshot(collection(db, 'warehouses'), (s) => setWarehouses(s.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))));
    const unsubAcc = onSnapshot(collection(db, 'accounts'), (s) => setShopAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ShopAccount))));
    const unsubCurr = onSnapshot(collection(db, 'currencies'), (s) => setCurrencies(s.docs.map(d => ({ id: d.id, ...d.data() } as Currency))));
    const unsubClearing = onSnapshot(collection(db, 'clearingAgents'), (s) => setClearingAgents(s.docs.map(d => ({ id: d.id, ...d.data() } as ClearingAgent))));
    const unsubFreight = onSnapshot(collection(db, 'freightForwarders'), (s) => setFreightForwarders(s.docs.map(d => ({ id: d.id, ...d.data() } as FreightForwarder))));
    const unsubCustomExp = onSnapshot(collection(db, 'customExpenseTypes'), (s) => setCustomExpenseTypes(s.docs.map(d => ({ id: d.id, ...d.data() } as CustomExpenseType))));
    const unsubExpAcc = onSnapshot(collection(db, 'expenseAccounts'), (s) => setExpenseAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseAccount))));
    const unsubAssets = onSnapshot(collection(db, 'assets'), (s) => setAssets(s.docs.map(d => ({ id: d.id, ...d.data(), purchaseDate: (d.data().purchaseDate as any).toDate() } as Asset))));
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as User))));

    return () => {
      unsubShops(); unsubProds(); unsubTrans(); unsubShip(); unsubAlerts(); unsubCust(); 
      unsubWH(); unsubAcc(); unsubCurr(); unsubClearing(); unsubFreight(); 
      unsubCustomExp(); unsubExpAcc(); unsubAssets(); unsubUsers();
    };
  }, []);

  const currentShopCurrency = useMemo(() => {
    const shop = shops.find(s => s.id === shopId);
    return currencies.find(c => c.id === shop?.currencyCode) || { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
  }, [shopId, shops, currencies]);

  const login = async (username: string, password?: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      setShopId(null);
      return true;
    }
    if (username === 'admin' && password === 'admin123') {
      const admin = { id: 'admin', name: 'System Admin', username: 'admin', role: UserRole.HEAD_OFFICE };
      setCurrentUser(admin);
      setRole(UserRole.HEAD_OFFICE);
      setShopId(null);
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setRole(null);
    setShopId(null);
  };

  const switchShop = (id: string | null) => setShopId(id);

  const addShop = async (data: Omit<Shop, 'id'>) => { await addDoc(collection(db, 'shops'), data); };
  const updateShop = async (id: string, data: Partial<Shop>) => { await updateDoc(doc(db, 'shops', id), data); };
  const deleteShop = async (id: string) => { await deleteDoc(doc(db, 'shops', id)); };

  const addCustomer = async (data: Omit<Customer, 'id'>) => { await addDoc(collection(db, 'customers'), data); };
  const addProduct = async (data: Omit<Product, 'id'>) => { await addDoc(collection(db, 'products'), data); };
  const bulkAddProducts = async (items: Omit<Product, 'id'>[]) => {
    const batch = writeBatch(db);
    items.forEach(item => batch.set(doc(collection(db, 'products')), item));
    await batch.commit();
  };

  const addShopAccount = async (data: Omit<ShopAccount, 'id'>) => { await addDoc(collection(db, 'accounts'), data); };
  const updateCurrency = async (data: { id: string, rate: number }) => {
    const q = query(collection(db, 'currencies'), where('id', '==', data.id));
    const snap = await getDocs(q);
    if (!snap.empty) await updateDoc(doc(db, 'currencies', snap.docs[0].id), { rate: data.rate });
  };
  const addCurrency = async (data: Currency) => { await addDoc(collection(db, 'currencies'), data); };

  const getStockLevel = useCallback((productId: string, locationId?: string) => {
    let stock = 0;
    transactions.filter(t => t.productId === productId && (locationId ? t.locationId === locationId : true)).forEach(t => {
      const qty = t.quantity || 0;
      if ([TransactionType.IMPORT, TransactionType.SALES_RETURN, TransactionType.STOCK_TRANSFER_IN, TransactionType.OPENING_STOCK].includes(t.type)) stock += qty;
      if ([TransactionType.CASH_SALE, TransactionType.CREDIT_SALE, TransactionType.STOCK_TRANSFER_OUT].includes(t.type)) stock -= qty;
    });
    return stock;
  }, [transactions]);

  const getAdvanceBalance = useCallback((customerId: string) => {
    let balance = 0;
    transactions.filter(t => t.customerId === customerId).forEach(t => {
      if (t.type === TransactionType.CUSTOMER_ADVANCE) balance += t.amount;
      if (t.type === TransactionType.ADVANCE_USAGE) balance -= t.amount;
    });
    return balance;
  }, [transactions]);

  const formatCurrency = (amountInBase: number) => {
    const localAmount = amountInBase * (currentShopCurrency.rate || 1);
    return `${currentShopCurrency.symbol}${localAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const logAlert = async (data: Omit<Alert, 'id' | 'isRead'>) => {
    await addDoc(collection(db, 'alerts'), { ...data, isRead: false });
  };

  const markAlertAsRead = async (id: string) => {
    await updateDoc(doc(db, 'alerts', id), { isRead: true });
  };

  const recordSale = async (payload: {
    shopId: string;
    customerId: string;
    invoiceNumber: string;
    manualReference: string;
    items: SaleItem[];
    cashPaid: number;
    advanceApplied: number;
    date: Date;
    paymentAccountId: string;
  }) => {
    const batch = writeBatch(db);
    const shop = shops.find(s => s.id === payload.shopId);
    const shopName = shop?.name || 'Unknown Shop';

    for (const item of payload.items) {
      const product = products.find(p => p.id === item.productId);
      const saleData: any = {
        shopId: payload.shopId,
        customerId: payload.customerId,
        invoiceId: payload.invoiceNumber,
        externalReference: payload.manualReference,
        productId: item.productId,
        type: payload.cashPaid >= (item.salePrice * item.quantity) ? TransactionType.CASH_SALE : TransactionType.CREDIT_SALE,
        description: `Sale of ${item.quantity}x ${product?.name}`,
        amount: item.salePrice / currentShopCurrency.rate, 
        quantity: item.quantity,
        date: payload.date,
        locationId: item.locationId || payload.shopId
      };
      batch.set(doc(collection(db, 'transactions')), saleData);

      if (product) {
          const minPriceLocal = product.minSalePrice * (currentShopCurrency.rate || 1);
          if (item.salePrice < minPriceLocal) {
              await logAlert({
                  shopId: 'HO',
                  type: AlertType.PRICE_VIOLATION,
                  message: `Price Violation in "${shopName}": "${product.name}" sold for ${currentShopCurrency.symbol}${item.salePrice.toFixed(2)} (Min Allowed: ${currentShopCurrency.symbol}${minPriceLocal.toFixed(2)}). Inv #${payload.invoiceNumber}.`,
                  context: { 
                      invoiceId: payload.invoiceNumber, 
                      productId: item.productId, 
                      productName: product.name, 
                      soldPrice: item.salePrice, 
                      minPrice: minPriceLocal,
                      currency: currentShopCurrency.id,
                      shopName,
                      shopId: payload.shopId 
                  },
                  date: new Date()
              });
          }
      }
    }

    if (payload.cashPaid > 0) {
      batch.set(doc(collection(db, 'transactions')), {
        shopId: payload.shopId,
        customerId: payload.customerId,
        invoiceId: payload.invoiceNumber,
        type: TransactionType.SALES_RECEIPT,
        description: `Payment for Invoice #${payload.invoiceNumber}`,
        amount: payload.cashPaid / currentShopCurrency.rate,
        paymentAccountId: payload.paymentAccountId,
        date: payload.date
      });
    }

    if (payload.advanceApplied > 0) {
      batch.set(doc(collection(db, 'transactions')), {
        shopId: payload.shopId,
        customerId: payload.customerId,
        invoiceId: payload.invoiceNumber,
        type: TransactionType.ADVANCE_USAGE,
        description: `Advance applied to Invoice #${payload.invoiceNumber}`,
        amount: payload.advanceApplied / currentShopCurrency.rate,
        date: payload.date
      });
    }

    await batch.commit();
  };

  const recordPayment = async (payload: any) => {
    await addDoc(collection(db, 'transactions'), {
      ...payload,
      amount: payload.amount / (payload.shopId === 'HO' ? 1 : currentShopCurrency.rate),
      type: TransactionType.SALES_RECEIPT,
      description: payload.notes || `Payment Received`
    });
  };

  const addExpense = async (payload: any) => {
    await addDoc(collection(db, 'transactions'), {
      ...payload,
      amount: payload.amount / currentShopCurrency.rate,
      type: TransactionType.EXPENSE,
      description: payload.description || 'General Expense'
    });
  };

  const addWarehouse = async (data: Omit<Warehouse, 'id'>) => { await addDoc(collection(db, 'warehouses'), data); };

  const transferStock = async (payload: { shopId: string, productId: string, quantity: number, fromLocationId: string, toLocationId: string, date: Date }) => {
    const batch = writeBatch(db);
    batch.set(doc(collection(db, 'transactions')), {
      shopId: payload.shopId,
      productId: payload.productId,
      type: TransactionType.STOCK_TRANSFER_OUT,
      quantity: payload.quantity,
      locationId: payload.fromLocationId,
      description: `Stock Transfer to ${warehouses.find(w => w.id === payload.toLocationId)?.name || 'other location'}`,
      date: payload.date
    });

    batch.set(doc(collection(db, 'transactions')), {
      shopId: payload.shopId,
      productId: payload.productId,
      type: TransactionType.STOCK_TRANSFER_IN,
      quantity: payload.quantity,
      locationId: payload.toLocationId,
      description: `Stock Transfer from ${warehouses.find(w => w.id === payload.fromLocationId)?.name || 'other location'}`,
      date: payload.date
    });

    await batch.commit();
  };

  const addAsset = async (payload: Omit<Asset, 'id' | 'status'>) => {
    await addDoc(collection(db, 'assets'), { ...payload, status: AssetStatus.ACTIVE });
    await addDoc(collection(db, 'transactions'), {
      shopId: payload.shopId,
      type: TransactionType.EXPENSE,
      description: `Asset Purchase: ${payload.name}`,
      amount: payload.purchaseCost / currentShopCurrency.rate,
      paymentAccountId: payload.paymentAccountId,
      expenseAccountId: payload.expenseAccountId,
      date: payload.purchaseDate
    });
  };

  const recordAdvance = async (payload: any) => {
    await addDoc(collection(db, 'transactions'), {
      ...payload,
      amount: payload.amount / currentShopCurrency.rate,
      type: TransactionType.CUSTOMER_ADVANCE,
      description: `Customer Advance Received`,
      receiptNumber: `ADV-${Date.now().toString().slice(-6)}`
    });
  };

  const addExport = async (payload: any) => {
    await addDoc(collection(db, 'shipments'), {
      id: payload.shipmentId,
      shopId: payload.shopId,
      date: new Date(),
      status: ShipmentStatus.PENDING,
      items: payload.items,
      freightCost: payload.freightForwarder.amount,
      freightForwarderId: payload.freightForwarder.id,
      clearingCost: payload.clearingAgent.amount,
      clearingAgentId: payload.clearingAgent.id,
      customExpenseCost: payload.customExpense.amount,
      customExpenseTypeId: payload.customExpense.typeId,
      expectedDuty: payload.expectedDuty
    });
  };

  const receiveShipment = async (payload: { shipmentId: string, receivedItems: any[], locationId: string, extraItems?: any[] }) => {
    const shipment = shipments.find(s => s.id === payload.shipmentId);
    if (!shipment) return;

    const batch = writeBatch(db);
    const totalExpectedQty = shipment.items.reduce((sum, i) => sum + i.expectedQuantity, 0);
    const overheadPerUnit = totalExpectedQty > 0 ? (shipment.freightCost + shipment.clearingCost + shipment.customExpenseCost + shipment.expectedDuty) / totalExpectedQty : 0;

    for (const item of payload.receivedItems) {
      const originalItem = shipment.items.find(i => i.productId === item.productId);
      batch.set(doc(collection(db, 'transactions')), {
        shopId: shipment.shopId,
        productId: item.productId,
        type: TransactionType.IMPORT,
        quantity: item.quantity,
        amount: (originalItem?.landedCost || 0) + overheadPerUnit,
        description: `Shipment Receipt #${shipment.id}`,
        locationId: payload.locationId,
        date: new Date()
      });
    }

    if (payload.extraItems) {
        for (const extra of payload.extraItems) {
            batch.set(doc(collection(db, 'transactions')), {
                shopId: shipment.shopId,
                productId: extra.productId,
                type: TransactionType.IMPORT,
                quantity: extra.quantity,
                amount: extra.unitCost / currentShopCurrency.rate,
                description: `Extra Items Recv with Shipment #${shipment.id}: ${extra.notes || ''}`,
                locationId: payload.locationId,
                date: new Date()
            });
        }
    }

    batch.update(doc(db, 'shipments', payload.shipmentId), { status: ShipmentStatus.RECEIVED });
    await batch.commit();
  };

  const updateShipmentCosts = async (payload: any) => {
      await updateDoc(doc(db, 'shipments', payload.shipmentId), {
          freightCost: payload.freightCost,
          clearingCost: payload.clearingCost,
          customExpenseCost: payload.customExpenseCost,
          expectedDuty: payload.expectedDuty
      });
  };

  const recordPaymentVoucher = async (payload: any) => {
      await addDoc(collection(db, 'transactions'), {
          shopId: payload.shopId,
          type: TransactionType.EXPENSE,
          amount: payload.amount / (payload.shopId === 'HO' ? 1 : currentShopCurrency.rate),
          paymentAccountId: payload.paymentAccountId,
          description: payload.notes || `PV: ${payload.category} - ${payload.beneficiaryName}`,
          date: payload.date
      });
  };

  const recordSalesReturn = async (payload: any) => {
      const batch = writeBatch(db);
      for (const item of payload.returnedItems) {
          batch.set(doc(collection(db, 'transactions')), {
              shopId: payload.shopId,
              customerId: payload.customerId,
              invoiceId: payload.invoiceId,
              productId: item.productId,
              type: TransactionType.SALES_RETURN,
              quantity: item.quantity,
              amount: item.salePrice / currentShopCurrency.rate,
              description: `Sales Return: ${payload.reason}`,
              locationId: payload.locationId,
              date: payload.date
          });
      }
      if (payload.refundMethod === 'cash') {
          batch.set(doc(collection(db, 'transactions')), {
              shopId: payload.shopId,
              type: TransactionType.EXPENSE,
              amount: payload.returnedItems.reduce((s:number, i:any) => s + (i.quantity * i.salePrice), 0) / currentShopCurrency.rate,
              paymentAccountId: payload.paymentAccountId,
              description: `Cash Refund for Return - Inv #${payload.invoiceId}`,
              date: payload.date
          });
      }
      await batch.commit();
  };

  const addOpeningStock = async (p: OpeningStockPayload) => {
      await addDoc(collection(db, 'transactions'), {
          shopId: p.shopId,
          productId: p.productId,
          type: TransactionType.OPENING_STOCK,
          quantity: p.quantity,
          amount: p.unitCost / currentShopCurrency.rate,
          locationId: p.locationId,
          description: p.notes,
          date: p.date
      });
  };

  const bulkAddOpeningStock = async (items: OpeningStockPayload[]) => {
      const batch = writeBatch(db);
      items.forEach(p => {
          batch.set(doc(collection(db, 'transactions')), {
              shopId: p.shopId,
              productId: p.productId,
              type: TransactionType.OPENING_STOCK,
              quantity: p.quantity,
              amount: p.unitCost / currentShopCurrency.rate,
              locationId: p.locationId,
              description: p.notes,
              date: p.date
          });
      });
      await batch.commit();
  };

  const addUser = async (data: Omit<User, 'id'>) => { await addDoc(collection(db, 'users'), data); };
  const updateUser = async (id: string, data: Partial<User>) => { await updateDoc(doc(db, 'users', id), data); };
  const deleteUser = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };

  const addClearingAgent = async (data: Omit<ClearingAgent, 'id'>) => { await addDoc(collection(db, 'clearingAgents'), data); };
  const addFreightForwarder = async (data: Omit<FreightForwarder, 'id'>) => { await addDoc(collection(db, 'freightForwarders'), data); };
  const addCustomExpenseType = async (data: Omit<CustomExpenseType, 'id'>) => { await addDoc(collection(db, 'customExpenseTypes'), data); };
  const addExpenseAccount = async (data: Omit<ExpenseAccount, 'id'>) => { await addDoc(collection(db, 'expenseAccounts'), data); };

  const resetSystem = async () => {
      const collections = ['shops', 'products', 'transactions', 'shipments', 'alerts', 'customers', 'warehouses', 'accounts', 'currencies', 'clearingAgents', 'freightForwarders', 'customExpenseTypes', 'expenseAccounts', 'assets', 'users'];
      for (const col of collections) {
          const snap = await getDocs(collection(db, col));
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
      window.location.reload();
  };

  const clearTransactions = async () => {
      const collections = ['transactions', 'shipments', 'alerts'];
      for (const col of collections) {
          const snap = await getDocs(collection(db, col));
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
  };

  return (
    <AppContext.Provider value={{
      currentUser, role, shopId, shops, products, transactions, shipments, alerts, customers, warehouses, shopAccounts, currencies, clearingAgents, freightForwarders, customExpenseTypes, expenseAccounts, assets, currentShopCurrency, isDemoMode, connectionError, login, logout, switchShop, addShop, updateShop, deleteShop, addCustomer, addProduct, bulkAddProducts, addShopAccount, updateCurrency, addCurrency, recordSale, recordPayment, addExpense, addWarehouse, transferStock, addAsset, recordAdvance, receiveShipment, addExport, updateShipmentCosts, recordPaymentVoucher, recordSalesReturn, addOpeningStock, bulkAddOpeningStock, markAlertAsRead, logAlert, resetSystem, clearTransactions, getStockLevel, getAdvanceBalance, formatCurrency, users, addUser, updateUser, deleteUser, addClearingAgent, addFreightForwarder, addCustomExpenseType, addExpenseAccount
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
