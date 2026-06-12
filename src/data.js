import {
  Activity, BadgePercent, Banknote, Barcode, Boxes, Building2, CalendarClock,
  ChartNoAxesCombined, CircleDollarSign, ClipboardCheck, Contact, CreditCard,
  Dumbbell, FileBarChart, Gift, Globe2, Landmark, LayoutDashboard, ListOrdered,
  Megaphone, PackageCheck, PackageOpen, ReceiptText, RefreshCcw, Settings,
  ShieldCheck, ShoppingBag, ShoppingCart, Store, Tags, Truck, Undo2, UserCog,
  Users, Warehouse,
} from 'lucide-react'

export const industries = {
  retail: { label: 'Retail & Grocery', icon: ShoppingBag, accent: '#6d5dfc' },
  ecommerce: { label: 'Ecommerce', icon: Globe2, accent: '#0ea5e9' },
  gym: { label: 'Gym & Wellness', icon: Dumbbell, accent: '#f97316' },
  services: { label: 'Services', icon: CalendarClock, accent: '#10b981' },
}

export const navGroups = [
  {
    label: 'Workspace',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/pos', label: 'Point of Sale', icon: ShoppingCart },
      { path: '/orders', label: 'Orders', icon: ListOrdered },
    ],
  },
  {
    label: 'Catalog & Stock',
    items: [
      { path: '/products', label: 'Products & Services', icon: Boxes },
      { path: '/categories', label: 'Categories', icon: Tags },
      { path: '/inventory', label: 'Inventory', icon: Warehouse },
      { path: '/stock-transfers', label: 'Stock Transfers', icon: RefreshCcw },
      { path: '/stock-counts', label: 'Stock Counts', icon: ClipboardCheck },
      { path: '/barcode-labels', label: 'Barcode Labels', icon: Barcode },
    ],
  },
  {
    label: 'Relationships',
    items: [
      { path: '/customers', label: 'Customers', icon: Users },
      { path: '/loyalty', label: 'Loyalty & Gift Cards', icon: Gift },
      { path: '/suppliers', label: 'Suppliers', icon: Truck },
      { path: '/marketing', label: 'Promotions', icon: Megaphone },
    ],
  },
  {
    label: 'Purchasing',
    items: [
      { path: '/purchases', label: 'Purchase Orders', icon: PackageOpen },
      { path: '/receiving', label: 'Goods Receiving', icon: PackageCheck },
      { path: '/returns', label: 'Returns', icon: Undo2 },
    ],
  },
  {
    label: 'Finance',
    items: [
      { path: '/accounts', label: 'Accounts', icon: Landmark },
      { path: '/expenses', label: 'Expenses', icon: ReceiptText },
      { path: '/payments', label: 'Payments', icon: CreditCard },
      { path: '/reports', label: 'Reports', icon: FileBarChart },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/locations', label: 'Locations & Counters', icon: Store },
      { path: '/staff', label: 'Staff & Roles', icon: UserCog },
      { path: '/audit-log', label: 'Audit Log', icon: ShieldCheck },
      { path: '/integrations', label: 'Integrations', icon: Activity },
      { path: '/settings', label: 'Settings', icon: Settings },
    ],
  },
]

export const initialProducts = [
  { id: 'PRD-1001', name: 'Everyday Runner', sku: 'SH-RUN-001', category: 'Footwear', price: 89, cost: 42, stock: 28, reorder: 8, channel: 'All channels', status: 'Active' },
  { id: 'PRD-1002', name: 'Classic Cotton Tee', sku: 'AP-TEE-002', category: 'Apparel', price: 32, cost: 11, stock: 46, reorder: 12, channel: 'All channels', status: 'Active' },
  { id: 'PRD-1003', name: 'Hydration Bottle', sku: 'AC-BTL-003', category: 'Accessories', price: 24, cost: 8, stock: 7, reorder: 10, channel: 'Store + Web', status: 'Low stock' },
  { id: 'PRD-1004', name: 'Premium Membership', sku: 'GYM-PRO-01', category: 'Membership', price: 65, cost: 0, stock: 999, reorder: 0, channel: 'All channels', status: 'Active' },
  { id: 'PRD-1005', name: 'Personal Training', sku: 'SVC-PT-001', category: 'Service', price: 45, cost: 20, stock: 999, reorder: 0, channel: 'Store', status: 'Active' },
  { id: 'PRD-1006', name: 'Wireless Headphones', sku: 'EL-AUD-006', category: 'Electronics', price: 119, cost: 71, stock: 15, reorder: 5, channel: 'Web', status: 'Active' },
  { id: 'PRD-1007', name: 'Organic Snack Box', sku: 'GR-SNK-007', category: 'Grocery', price: 18, cost: 9, stock: 4, reorder: 8, channel: 'Store + Web', status: 'Low stock' },
  { id: 'PRD-1008', name: 'Yoga Mat Pro', sku: 'GYM-YOG-08', category: 'Fitness', price: 54, cost: 23, stock: 22, reorder: 6, channel: 'All channels', status: 'Active' },
]

export const initialCustomers = [
  { id: 'CUS-2401', name: 'Olivia Martin', email: 'olivia@example.com', phone: '+1 555 0148', segment: 'VIP', points: 1840, spent: 4260, status: 'Active' },
  { id: 'CUS-2402', name: 'Noah Williams', email: 'noah@example.com', phone: '+1 555 0192', segment: 'Regular', points: 620, spent: 1980, status: 'Active' },
  { id: 'CUS-2403', name: 'Emma Wilson', email: 'emma@example.com', phone: '+1 555 0163', segment: 'New', points: 120, spent: 340, status: 'Active' },
  { id: 'CUS-2404', name: 'Liam Taylor', email: 'liam@example.com', phone: '+1 555 0187', segment: 'At risk', points: 210, spent: 1120, status: 'Inactive' },
]

export const initialOrders = [
  { id: 'ORD-1088', customer: 'Olivia Martin', channel: 'In store', location: 'Downtown', total: 178, payment: 'Card', status: 'Completed', date: '2026-06-10' },
  { id: 'ORD-1087', customer: 'Walk-in customer', channel: 'In store', location: 'Downtown', total: 86, payment: 'Cash', status: 'Completed', date: '2026-06-10' },
  { id: 'ORD-1086', customer: 'Emma Wilson', channel: 'Online', location: 'Web store', total: 151, payment: 'Wallet', status: 'Processing', date: '2026-06-10' },
  { id: 'ORD-1085', customer: 'Noah Williams', channel: 'Click & collect', location: 'Westside', total: 72, payment: 'Card', status: 'Ready', date: '2026-06-09' },
  { id: 'ORD-1084', customer: 'Liam Taylor', channel: 'In store', location: 'Westside', total: 119, payment: 'Split', status: 'Refunded', date: '2026-06-09' },
]

export const moduleConfigs = {
  products: { title: 'Products & Services', subtitle: 'Manage sellable products, services, variants, pricing, tax and channels.', icon: Boxes, action: 'Add product', columns: ['name', 'sku', 'category', 'price', 'stock', 'channel', 'status'], source: 'products' },
  categories: { title: 'Categories', subtitle: 'Organize the catalog and assign tax, margin, and visibility rules.', icon: Tags, action: 'Add category', columns: ['name', 'description', 'products', 'tax', 'channel', 'status'] },
  inventory: { title: 'Inventory Control', subtitle: 'Real-time stock by location with reorder alerts and valuation.', icon: Warehouse, action: 'Adjust stock', columns: ['item', 'sku', 'location', 'available', 'committed', 'reorder', 'value', 'status'] },
  'stock-transfers': { title: 'Stock Transfers', subtitle: 'Move inventory between stores and warehouses with traceable approvals.', icon: RefreshCcw, action: 'New transfer', columns: ['reference', 'from', 'to', 'items', 'requestedBy', 'date', 'status'] },
  'stock-counts': { title: 'Stock Counts', subtitle: 'Run full or cycle counts and investigate inventory variance.', icon: ClipboardCheck, action: 'Start count', columns: ['reference', 'location', 'scope', 'expected', 'counted', 'variance', 'status'] },
  'barcode-labels': { title: 'Barcode Labels', subtitle: 'Design, queue, and print product and shelf labels.', icon: Barcode, action: 'Print labels', columns: ['item', 'sku', 'format', 'quantity', 'price', 'location', 'status'] },
  customers: { title: 'Customer CRM', subtitle: 'Unified profiles, purchase history, segments, credit and loyalty.', icon: Users, action: 'Add customer', columns: ['name', 'email', 'phone', 'segment', 'points', 'spent', 'status'], source: 'customers' },
  loyalty: { title: 'Loyalty & Gift Cards', subtitle: 'Configure points, rewards, tiers, store credit and gift cards.', icon: Gift, action: 'Issue reward', columns: ['program', 'type', 'members', 'issued', 'redeemed', 'expires', 'status'] },
  suppliers: { title: 'Supplier Management', subtitle: 'Manage suppliers, lead times, terms, balances and performance.', icon: Truck, action: 'Add supplier', columns: ['supplier', 'contact', 'leadTime', 'terms', 'balance', 'rating', 'status'] },
  marketing: { title: 'Promotions & Campaigns', subtitle: 'Create automatic discounts, coupons and customer campaigns.', icon: BadgePercent, action: 'New promotion', columns: ['campaign', 'audience', 'discount', 'channel', 'starts', 'ends', 'status'] },
  purchases: { title: 'Purchase Orders', subtitle: 'Plan replenishment, create supplier orders and track approvals.', icon: PackageOpen, action: 'New purchase order', columns: ['reference', 'supplier', 'location', 'items', 'total', 'delivery', 'status'] },
  receiving: { title: 'Goods Receiving', subtitle: 'Receive supplier shipments, capture costs and update stock instantly.', icon: PackageCheck, action: 'Receive shipment', columns: ['reference', 'purchaseOrder', 'supplier', 'location', 'items', 'received', 'status'] },
  returns: { title: 'Returns & Refunds', subtitle: 'Process sales and supplier returns with reason and disposition tracking.', icon: Undo2, action: 'New return', columns: ['reference', 'order', 'customer', 'items', 'refund', 'reason', 'status'] },
  accounts: { title: 'Accounts & Ledgers', subtitle: 'Track cash, banks, receivables, payables and journal activity.', icon: Landmark, action: 'New transaction', columns: ['account', 'type', 'number', 'debit', 'credit', 'balance', 'status'] },
  expenses: { title: 'Expense Management', subtitle: 'Record, approve and categorize operating expenses.', icon: ReceiptText, action: 'Add expense', columns: ['reference', 'category', 'vendor', 'amount', 'method', 'date', 'status'] },
  payments: { title: 'Payments & Reconciliation', subtitle: 'Review tenders, settlements, refunds and cash drawer variances.', icon: CreditCard, action: 'Record payment', columns: ['reference', 'order', 'method', 'provider', 'amount', 'fee', 'status'] },
  locations: { title: 'Locations & Counters', subtitle: 'Manage stores, warehouses, counters, registers and business hours.', icon: Store, action: 'Add location', columns: ['location', 'type', 'manager', 'counters', 'inventory', 'timezone', 'status'] },
  staff: { title: 'Staff & Roles', subtitle: 'Control employee access, shifts, performance and permissions.', icon: UserCog, action: 'Invite staff', columns: ['name', 'role', 'location', 'shift', 'sales', 'lastActive', 'status'] },
  'audit-log': { title: 'Security Audit Log', subtitle: 'Immutable history of sign-ins, overrides, data changes and exports.', icon: ShieldCheck, action: 'Export log', columns: ['time', 'user', 'action', 'resource', 'location', 'ip', 'result'] },
  integrations: { title: 'Integrations & Channels', subtitle: 'Connect ecommerce, payments, accounting, messaging and hardware.', icon: Activity, action: 'Add integration', columns: ['integration', 'category', 'account', 'lastSync', 'records', 'health', 'status'] },
}

const samples = {
  categories: [
    ['Footwear', 'Shoes and related products', 42, '8%', 'All channels', 'Active'],
    ['Membership', 'Recurring gym access plans', 4, '0%', 'All channels', 'Active'],
    ['Services', 'Bookable professional services', 12, '10%', 'Store + Web', 'Active'],
  ],
  inventory: [
    ['Hydration Bottle', 'AC-BTL-003', 'Downtown', 7, 2, 10, '$56', 'Low stock'],
    ['Everyday Runner', 'SH-RUN-001', 'Downtown', 28, 4, 8, '$1,176', 'Healthy'],
    ['Organic Snack Box', 'GR-SNK-007', 'Westside', 4, 1, 8, '$36', 'Reorder'],
  ],
  'stock-transfers': [['TRF-2041', 'Main warehouse', 'Downtown', 18, 'Ava Chen', '2026-06-10', 'In transit'], ['TRF-2040', 'Downtown', 'Westside', 7, 'Admin', '2026-06-09', 'Completed']],
  'stock-counts': [['CNT-509', 'Downtown', 'Cycle: Footwear', 146, 144, -2, 'Review'], ['CNT-508', 'Westside', 'Full count', 812, 812, 0, 'Completed']],
  'barcode-labels': [['Everyday Runner', 'SH-RUN-001', '58 x 40 mm', 12, '$89.00', 'Downtown', 'Queued'], ['Yoga Mat Pro', 'GYM-YOG-08', '50 x 25 mm', 6, '$54.00', 'Printed']],
  loyalty: [['Nexora Rewards', 'Points + tiers', 1248, '184,200 pts', '72,840 pts', 'Never', 'Active'], ['$25 Summer Card', 'Gift card', 320, '$8,000', '$4,275', '2027-06-01', 'Active']],
  suppliers: [['Northstar Wholesale', 'Maya / +1 555 0101', '5 days', 'Net 30', '$4,820', '4.8', 'Active'], ['Freshline Foods', 'Sam / +1 555 0176', '2 days', 'Net 14', '$1,280', '4.5', 'Active']],
  marketing: [['Summer essentials', 'VIP + Regular', '15%', 'Store + Web', '2026-06-01', '2026-06-30', 'Live'], ['Welcome reward', 'New customers', '$10', 'All channels', 'Always', 'Never', 'Active']],
  purchases: [['PO-6048', 'Northstar Wholesale', 'Main warehouse', 42, '$3,860', '2026-06-14', 'Approved'], ['PO-6047', 'Freshline Foods', 'Downtown', 30, '$540', '2026-06-11', 'Part received']],
  receiving: [['GRN-3038', 'PO-6047', 'Freshline Foods', 'Downtown', 30, 22, 'Partial'], ['GRN-3037', 'PO-6045', 'Northstar Wholesale', 'Main warehouse', 18, 18, 'Posted']],
  returns: [['RET-8019', 'ORD-1084', 'Liam Taylor', 1, '$119', 'Changed mind', 'Refunded'], ['RET-8018', 'ORD-1073', 'Walk-in customer', 2, '$36', 'Damaged', 'Inspected']],
  accounts: [['Main Cash Drawer', 'Cash', '1001', '$12,460', '$9,180', '$3,280', 'Open'], ['Operating Bank', 'Bank', '1101', '$58,200', '$31,420', '$26,780', 'Reconciled']],
  expenses: [['EXP-9028', 'Utilities', 'City Energy', '$860', 'Bank', '2026-06-09', 'Approved'], ['EXP-9027', 'Marketing', 'Ad Network', '$420', 'Card', '2026-06-08', 'Pending']],
  payments: [['PAY-7741', 'ORD-1088', 'Card', 'Stripe Terminal', '$178', '$3.41', 'Settled'], ['PAY-7740', 'ORD-1087', 'Cash', 'Counter C001', '$86', '$0', 'Reconciled']],
  locations: [['Downtown', 'Retail store', 'Ava Chen', 3, 862, 'America/New_York', 'Open'], ['Main warehouse', 'Warehouse', 'Ethan Lee', 0, 2416, 'America/New_York', 'Active'], ['Web store', 'Online channel', 'System', 0, 3278, 'UTC', 'Live']],
  staff: [['Ava Chen', 'Store manager', 'Downtown', '08:00 - 17:00', '$4,260', '2 min ago', 'On shift'], ['Mateo Diaz', 'Cashier', 'Downtown', '09:00 - 18:00', '$1,840', '5 min ago', 'On shift'], ['Sophia Kim', 'Inventory', 'Main warehouse', '07:00 - 16:00', '$0', '1 hr ago', 'Active']],
  'audit-log': [['10:42:18', 'Admin', 'Price override', 'ORD-1089', 'Downtown', '10.0.0.22', 'Allowed'], ['10:31:04', 'Mateo Diaz', 'Refund requested', 'ORD-1084', 'Downtown', '10.0.0.31', 'Approved'], ['09:58:33', 'System', 'Channel sync', 'Shopify', 'Cloud', 'Service', 'Success']],
  integrations: [['Shopify', 'Ecommerce', 'Nexora Demo Store', '3 min ago', '1,248', 'Healthy', 'Connected'], ['Stripe Terminal', 'Payments', 'Main account', 'Live', '86 today', 'Healthy', 'Connected'], ['QuickBooks', 'Accounting', 'Nexora LLC', '1 hr ago', '42', 'Attention', 'Connected']],
}

export function getSampleRows(key) {
  const config = moduleConfigs[key]
  if (config?.source === 'products') return initialProducts.map((p) => config.columns.map((c) => p[c]))
  if (config?.source === 'customers') return initialCustomers.map((p) => config.columns.map((c) => p[c]))
  return samples[key] || []
}

export const salesTrend = [
  { name: 'Mon', sales: 6400, profit: 2200 },
  { name: 'Tue', sales: 7800, profit: 2680 },
  { name: 'Wed', sales: 7200, profit: 2410 },
  { name: 'Thu', sales: 9100, profit: 3280 },
  { name: 'Fri', sales: 10500, profit: 3860 },
  { name: 'Sat', sales: 12400, profit: 4510 },
  { name: 'Sun', sales: 8600, profit: 3010 },
]

export const categoryData = [
  { name: 'Retail', value: 46, color: '#6d5dfc' },
  { name: 'Online', value: 28, color: '#0ea5e9' },
  { name: 'Memberships', value: 16, color: '#f97316' },
  { name: 'Services', value: 10, color: '#10b981' },
]

export const reportCards = [
  ['Sales summary', 'Revenue, transactions, discounts and taxes', ChartNoAxesCombined],
  ['Profit & loss', 'Gross margin, expenses and net profit', CircleDollarSign],
  ['Product performance', 'Velocity, margin and sell-through', Boxes],
  ['Inventory valuation', 'Stock position, aging and movement', Warehouse],
  ['Customer insights', 'Retention, segments and lifetime value', Contact],
  ['Staff performance', 'Sales, discounts and shift metrics', UserCog],
  ['Tax report', 'Collected tax by jurisdiction and rate', Landmark],
  ['Payments', 'Tender mix, fees and settlement status', Banknote],
  ['Omnichannel', 'Channel sales, fulfillment and returns', Globe2],
  ['Forecasting', 'Demand forecast and reorder suggestions', Activity],
]
