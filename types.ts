
export enum UserRole {
  HEAD_OFFICE = 'HEAD_OFFICE',
  SHOP_OPERATOR = 'SHOP_OPERATOR',
}

export interface Warehouse {
  id: string;
  name: string;
  shopId: string;
  address: string;
}

export enum TransactionType {
  CASH_SALE = 'CASH_SALE',
  CREDIT_SALE = 'CREDIT_SALE',
  SALES_RECEIPT = 'SALES_RECEIPT',
  EXPENSE = 'EXPENSE',
  IMPORT = 'IMPORT', // From Head Office to Shop (Product + Freight)
  IMPORT_OVERHEAD = 'IMPORT_OVERHEAD', // Local costs (Clearing, Duty) adding to inventory value
  SALES_RETURN = 'SALES_RETURN',
  STOCK_TRANSFER_IN = 'STOCK_TRANSFER_IN',
  STOCK_TRANSFER_OUT = 'STOCK_TRANSFER_OUT',
  CUSTOMER_ADVANCE = 'CUSTOMER_ADVANCE',
  ADVANCE_USAGE = 'ADVANCE_USAGE',
  OPENING_STOCK = 'OPENING_STOCK',
}

export enum ShipmentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
}

export enum AccountType {
    CASH = 'CASH',
    BANK = 'BANK',
}

export enum AlertType {
    STOCK_DISCREPANCY = 'STOCK_DISCREPANCY',
}

export interface Alert {
    id: string;
    shopId: string;
    type: AlertType;
    message: string;
    context?: {
        invoiceId?: string;
        productId?: string;
        [key: string]: any;
    };
    date: Date;
    isRead: boolean;
}

export interface ShopAccount {
  id: string;
  shopId: string;
  accountName: string;
  accountType: AccountType;
  bankName?: string;
  accountNumber?: string;
  openingBalance: number; // Stored in base currency (USD)
}

export interface Currency {
  id: string; // e.g., "USD"
  name: string; // e.g., "United States Dollar"
  symbol: string; // e.g., "$"
  rate: number; // Conversion rate from base currency (USD). USD rate is 1.
}

export interface ShipmentItem {
    productId: string;
    expectedQuantity: number;
    receivedQuantity?: number; // Filled by shop upon receipt
    landedCost: number; // Cost per unit from HO
}

export interface Shipment {
  id: string;
  shopId: string;
  date: Date;
  status: ShipmentStatus;
  items: ShipmentItem[];
  freightCost: number;
  freightForwarderId?: string;
  clearingCost: number;
  clearingAgentId?: string;
  customExpenseCost: number;
  customExpenseTypeId?: string;
  expectedDuty: number;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  district: string;
  country: string;
  isActive: boolean;
  currencyCode: string; // e.g., "USD", "EUR", "UGX"
  shopImageUrls: string[];
  surroundingsImageUrls: string[];
}

export interface Product {
  id: string;
  name: string;
  category: string;
  hoCost: number; // Head Office cost
  minSalePrice: number;
}

export interface User {
  id:string;
  username: string; // Login ID
  password?: string; // Simple auth for this demo
  name: string;
  role: UserRole;
  shopId?: string; // Deprecated: Single shop ID (Legacy)
  allowedShopIds?: string[]; // New: Array of accessible shop IDs
}

export interface Customer {
    id: string;
    name: string;
    shopId: string;
    phone?: string;
    reference?: string;
}

export interface AdvanceItem {
    productId: string;
    quantity: number;
}

export interface Transaction {
  id:string;
  shopId: string;
  invoiceId?: string;
  receiptNumber?: string;
  externalReference?: string; // Manual Reference (e.g., Manual Invoice Ref)
  productId?: string;
  type: TransactionType;
  description: string;
  amount: number; // For sales, it's price per unit. For expenses/receipts, it's total cost.
  quantity?: number; // For sales and imports
  customerId?: string; // For all sales and receipts
  expenseAccountId?: string; // For EXPENSE type
  paymentAccountId?: string; // ID of the ShopAccount used
  date: Date;
  locationId?: string;
  advanceForItems?: AdvanceItem[]; // For CUSTOMER_ADVANCE type
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  DISPOSED = 'DISPOSED',
  UNDER_REPAIR = 'UNDER_REPAIR',
}

export interface Asset {
  id: string;
  shopId: string;
  name: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: number; // Stored in base currency (USD)
  paymentAccountId: string; // Account used for purchase
  expenseAccountId: string; // Expense category
  status: AssetStatus;
}


// For Head Office specific setups
export interface ClearingAgent {
    id: string;
    name: string;
    contact: string;
}

export interface FreightForwarder {
    id: string;
    name: string;
    contact: string;
}

export interface CustomExpenseType {
    id: string;
    name: string;
    description: string;
}

export interface ExpenseAccount {
  id: string;
  name: string;
  description: string;
}