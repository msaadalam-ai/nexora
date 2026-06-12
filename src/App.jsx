import { useCallback, useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowDownRight, ArrowLeftRight, ArrowRight, ArrowUpRight, Bell,
  Box, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, Cloud, CloudOff,
  Command, Download, Eye, EyeOff, FileDown, Filter, Globe2, Grid2X2, HelpCircle,
  Landmark, LockKeyhole, LogOut, Menu, Minus, Moon, MoreHorizontal, Package,
  PanelLeftClose, PanelLeftOpen, Pencil, Plus, Printer, ReceiptText, RefreshCw,
  Search, Settings, ShieldCheck, ShoppingBag, ShoppingCart, Sparkles, Store,
  Sun, Trash2, TrendingUp, Upload, User, Users, WalletCards, Wifi, X, Zap,
} from 'lucide-react'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  categoryData, getSampleRows, industries, moduleConfigs, navGroups, reportCards, salesTrend,
} from './data'
import { money, useStore } from './store'
import { cloudApi } from './api'
import { cacheData, getCachedData, getConflicts, pendingEvents, queueEvent, removeConflict, syncOutbox } from './offline-db'
import { hardware } from './hardware'

const now = () => new Date().toISOString().slice(0, 10)

function notify(message, tone = 'success') {
  window.dispatchEvent(new CustomEvent('nexora-toast', { detail: { message, tone, id: Date.now() } }))
}

function downloadCsv(filename, headers, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  notify(`${filename} downloaded.`)
}

function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('nexora-token'))
  const [authenticated, setAuthenticated] = useState(() => Boolean(sessionStorage.getItem('nexora-token')))
  const [connection, setConnection] = useState('connecting')
  const [industry, setIndustry] = useState(() => localStorage.getItem('nexora-industry') || 'retail')
  const [dark, setDark] = useState(() => localStorage.getItem('nexora-theme') === 'dark')
  const storeState = useStore()
  const store = storeState
  const updateStore = storeState.update

  const hydrateCloudData = useCallback(async (accessToken) => {
    const [catalog, orders] = await Promise.all([cloudApi.products(accessToken), cloudApi.orders(accessToken)])
    await Promise.all([cacheData('products', catalog.items), cacheData('orders', orders.items)])
    updateStore((data) => ({
      ...data,
      products: catalog.items.map((product) => ({
        ...product, channel: 'All channels',
        status: product.stock <= product.reorder && product.reorder > 0 ? 'Low stock' : 'Active',
      })),
      orders: orders.items.length ? orders.items.map((order) => ({ ...order, id: order.orderNumber, date: order.date.slice(0, 10) })) : data.orders,
    }))
  }, [updateStore])
  const login = async (email, password) => {
    const result = await cloudApi.login(email, password)
    sessionStorage.setItem('nexora-token', result.accessToken)
    sessionStorage.setItem('nexora-profile', JSON.stringify(result))
    setToken(result.accessToken)
    await hydrateCloudData(result.accessToken)
    setConnection('online')
    setAuthenticated(true)
  }
  const logout = () => {
    sessionStorage.removeItem('nexora-token')
    sessionStorage.removeItem('nexora-profile')
    setToken(null)
    setAuthenticated(false)
  }
  const changeIndustry = (value) => {
    localStorage.setItem('nexora-industry', value)
    setIndustry(value)
  }
  const changeTheme = () => {
    localStorage.setItem('nexora-theme', dark ? 'light' : 'dark')
    setDark(!dark)
  }
  useEffect(() => {
    if (!token) return
    let active = true
    const connect = async () => {
      try {
        await cloudApi.session(token)
        await hydrateCloudData(token)
        await syncOutbox(token, cloudApi)
        if (active) setConnection('online')
      } catch {
        const [products, orders] = await Promise.all([getCachedData('products'), getCachedData('orders')])
        if (active && (products || orders)) setConnection('offline')
        else if (active) {
          logout()
          setConnection('offline')
        }
      }
    }
    connect()
    const online = () => connect()
    const offline = () => setConnection('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      active = false
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [hydrateCloudData, token])

  if (!authenticated) return <LoginPage onLogin={login} />
  return (
    <div className={dark ? 'app dark' : 'app'}>
      <AppShell
        industry={industry}
        setIndustry={changeIndustry}
        dark={dark}
        setDark={changeTheme}
        logout={logout}
        store={store}
        token={token}
        connection={connection}
      />
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState('password')
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('admin@nexorapos.com')
  const [password, setPassword] = useState('admin123')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    const valid = mode === 'password' ? email && password : pin.length === 4
    if (!valid) return setError(mode === 'password' ? 'Enter your email and password.' : 'Enter a 4-digit PIN.')
    setSubmitting(true)
    setError('')
    try {
      await onLogin(mode === 'password' ? email : 'admin@nexorapos.com', mode === 'password' ? password : 'admin123')
    } catch (loginError) {
      setError(loginError.message === 'invalid_credentials'
        ? 'Invalid email or password.'
        : 'Cloud API is unavailable. Check VITE_API_URL and confirm the Railway backend is running.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-one" />
      <div className="login-glow login-glow-two" />
      <section className="login-shell">
        <aside className="login-brand">
          <Logo light />
          <div className="brand-copy">
            <span className="eyebrow dark-eyebrow"><Sparkles size={14} /> Commerce operating system</span>
            <h1>Run every sale.<br />Grow every channel.</h1>
            <p>One adaptable POS for retail, ecommerce, memberships, and service businesses.</p>
            <div className="feature-pills">
              <span><Zap size={14} /> Fast checkout</span>
              <span><Box size={14} /> Live inventory</span>
              <span><TrendingUp size={14} /> Smart insights</span>
            </div>
          </div>
          <div className="login-proof">
            <div className="avatar-stack"><i>AM</i><i>SK</i><i>JD</i></div>
            <div><strong>Built for modern teams</strong><small>Secure, scalable and ready for every counter.</small></div>
          </div>
        </aside>
        <section className="login-panel">
          <div className="login-mobile-logo"><Logo /></div>
          <span className="eyebrow"><ShieldCheck size={14} /> Secure access portal</span>
          <h2>Welcome back</h2>
          <p className="muted">Sign in to your business workspace.</p>
          <div className="auth-tabs">
            <button className={mode === 'password' ? 'active' : ''} onClick={() => { setMode('password'); setError('') }}>Email & password</button>
            <button className={mode === 'pin' ? 'active' : ''} onClick={() => { setMode('pin'); setError('') }}>Quick PIN</button>
          </div>
          <form onSubmit={submit}>
            {mode === 'password' ? (
              <>
                <Field label="Email address">
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
                </Field>
                <Field label="Password" hint="Forgot password?" hintAction={() => setError('Password recovery is not connected in this demo. Contact your administrator.')}>
                  <div className="input-with-action">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                  </div>
                </Field>
              </>
            ) : (
              <Field label="Enter your 4-digit PIN">
                <input className="pin-input" type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
              </Field>
            )}
            {error && <div className="form-error"><AlertTriangle size={16} /> {error}</div>}
            <button className="primary-btn login-btn" type="submit" disabled={submitting}>{submitting ? 'Connecting...' : 'Sign in'} <ArrowRight size={17} /></button>
          </form>
          <div className="demo-note"><CircleHelp size={16} /><span>Demo access is prefilled. You can also use any 4-digit PIN.</span></div>
          <footer>© 2026 Nexora POS. Enterprise-ready commerce.</footer>
        </section>
      </section>
    </main>
  )
}

function Field({ label, hint, hintAction, children }) {
  return (
    <label className="field">
      <span>{label}{hint && <button type="button" onClick={hintAction}>{hint}</button>}</span>
      {children}
    </label>
  )
}

function Logo({ light = false, compact = false }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark"><Command size={compact ? 19 : 22} /></span>
      {!compact && <span><strong>Nexora</strong><small>POS</small></span>}
    </div>
  )
}

function AppShell({ industry, setIndustry, dark, setDark, logout, store, token, connection }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const location = useLocation()
  useEffect(() => {
    const receive = (event) => {
      const toast = event.detail
      setToasts((items) => [...items, toast])
      setTimeout(() => setToasts((items) => items.filter((item) => item.id !== toast.id)), 2800)
    }
    window.addEventListener('nexora-toast', receive)
    return () => window.removeEventListener('nexora-toast', receive)
  }, [])

  return (
    <div className="workspace">
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Logo compact={collapsed} />
          <button className="icon-btn collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <button className="icon-btn mobile-close" onClick={() => setMobileOpen(false)}><X size={20} /></button>
        </div>
        {!collapsed && (
          <div className="business-card">
            <span className="business-icon"><Store size={18} /></span>
            <span><strong>Nexora Demo</strong><small>Downtown flagship</small></span>
            <ChevronDown size={16} />
          </div>
        )}
        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              {!collapsed && <p>{group.label}</p>}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink key={item.path} to={item.path} title={item.label} onClick={() => setMobileOpen(false)}>
                    <Icon size={19} /><span>{item.label}</span>
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          {!collapsed && <div className="sync-state"><span><Cloud size={16} /> Cloud synced</span><small>Updated just now</small></div>}
          <button className="user-chip" onClick={logout} title="Sign out">
            <span className="avatar">AD</span>
            {!collapsed && <><span><strong>Alex Morgan</strong><small>Administrator</small></span><LogOut size={17} /></>}
          </button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <button className="icon-btn mobile-menu" onClick={() => setMobileOpen(true)}><Menu size={21} /></button>
          <button className="command-trigger" onClick={() => setCommandOpen(true)}>
            <Search size={17} /><span>Search anything...</span><kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-actions">
            <div className={`connection-pill ${connection === 'offline' ? 'offline' : ''}`}>{connection === 'offline' ? <CloudOff size={15} /> : <Wifi size={15} />}<span>{connection === 'online' ? 'Cloud online' : connection === 'offline' ? 'Offline mode' : 'Connecting'}</span></div>
            <IndustryPicker industry={industry} setIndustry={setIndustry} />
            <button className="icon-btn" onClick={setDark} title="Toggle theme">{dark ? <Sun size={19} /> : <Moon size={19} />}</button>
            <div className="popover-wrap">
              <button className="icon-btn notification-btn" title="Notifications" onClick={() => setNotificationsOpen(!notificationsOpen)}><Bell size={19} /><i /></button>
              {notificationsOpen && <Notifications items={store.data.notifications} store={store} close={() => setNotificationsOpen(false)} />}
            </div>
            <span className="top-avatar">AD</span>
          </div>
        </header>
        <div className="page-stage" key={location.pathname}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard data={store.data} industry={industry} />} />
            <Route path="/pos" element={<PointOfSale store={store} token={token} connection={connection} />} />
            <Route path="/orders" element={<OrdersPage store={store} />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage industry={industry} setIndustry={setIndustry} store={store} token={token} connection={connection} />} />
            {Object.keys(moduleConfigs).map((key) => (
              <Route key={key} path={`/${key}`} element={<ModulePage moduleKey={key} store={store} />} />
            ))}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </main>
      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      {commandOpen && <CommandPalette close={() => setCommandOpen(false)} />}
      <div className="toast-stack">{toasts.map((toast) => <div className={`toast ${toast.tone}`} key={toast.id}>{toast.tone === 'danger' ? <AlertTriangle size={17} /> : <Check size={17} />}<span>{toast.message}</span></div>)}</div>
    </div>
  )
}

function IndustryPicker({ industry, setIndustry }) {
  const [open, setOpen] = useState(false)
  const selected = industries[industry]
  const Icon = selected.icon
  return (
    <div className="popover-wrap">
      <button className="industry-trigger" onClick={() => setOpen(!open)}><Icon size={16} /><span>{selected.label}</span><ChevronDown size={15} /></button>
      {open && (
        <div className="popover industry-menu">
          <p>Business mode</p>
          {Object.entries(industries).map(([key, item]) => {
            const OptionIcon = item.icon
            return <button key={key} className={industry === key ? 'selected' : ''} onClick={() => { setIndustry(key); setOpen(false) }}><OptionIcon size={17} /><span><strong>{item.label}</strong><small>Adapt terminology and workflows</small></span>{industry === key && <Check size={16} />}</button>
          })}
        </div>
      )}
    </div>
  )
}

function Notifications({ items, store, close }) {
  const markRead = () => {
    store.update((data) => ({ ...data, notifications: data.notifications.map((item) => ({ ...item, unread: false })) }))
    notify('All notifications marked as read.')
  }
  return (
    <div className="popover notifications">
      <div className="popover-title"><strong>Notifications</strong><button onClick={close}><X size={16} /></button></div>
      {items.map((item) => <div className={`notification ${item.unread ? 'unread' : ''}`} key={item.id}><span /><div><strong>{item.title}</strong><p>{item.detail}</p></div></div>)}
      <button className="text-btn full" onClick={markRead}>Mark all as read</button>
    </div>
  )
}

function CommandPalette({ close }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const pages = navGroups.flatMap((group) => group.items)
  const filtered = pages.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())).slice(0, 8)
  const go = (path) => { navigate(path); close() }
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <div className="command-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="command-search"><Search size={20} /><input autoFocus placeholder="Search pages, products, customers..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>ESC</kbd></div>
        <div className="command-results">
          <p>Navigate</p>
          {filtered.map((item) => { const Icon = item.icon; return <button key={item.path} onClick={() => go(item.path)}><Icon size={18} /><span>{item.label}</span><ChevronRight size={16} /></button> })}
        </div>
        <footer><span><kbd>↑↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span></footer>
      </div>
    </div>
  )
}

function PageHeader({ eyebrow, title, description, children }) {
  return (
    <div className="page-header">
      <div>{eyebrow && <span className="page-eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

function Dashboard({ data, industry }) {
  const [rangeIndex, setRangeIndex] = useState(0)
  const ranges = ['Last 7 days', 'Last 30 days', 'This quarter']
  const totalRevenue = data.orders.filter((o) => o.status !== 'Refunded').reduce((sum, order) => sum + order.total, 0) + 28642
  const lowStock = data.products.filter((p) => p.stock <= p.reorder && p.reorder > 0).length
  const IndustryIcon = industries[industry].icon
  const cards = [
    { label: 'Net revenue', value: money(totalRevenue), note: '12.4% vs last period', icon: WalletCards, trend: 'up', color: 'violet' },
    { label: 'Transactions', value: '486', note: '8.2% vs last period', icon: ReceiptText, trend: 'up', color: 'blue' },
    { label: 'Average order', value: '$64.18', note: '2.1% vs last period', icon: ShoppingBag, trend: 'up', color: 'green' },
    { label: 'Low stock items', value: String(lowStock), note: 'Action recommended', icon: Package, trend: 'down', color: 'orange' },
  ]
  return (
    <>
      <PageHeader eyebrow="Overview" title="Good afternoon, Alex" description={`Here’s what’s happening across your ${industries[industry].label.toLowerCase()} business today.`}>
        <button className="secondary-btn" onClick={() => setRangeIndex((rangeIndex + 1) % ranges.length)}><CalendarIcon /> {ranges[rangeIndex]}</button>
        <button className="primary-btn" onClick={() => downloadCsv('dashboard-summary.csv', ['Metric', 'Value'], cards.map((card) => [card.label, card.value]))}><Download size={17} /> Export summary</button>
      </PageHeader>
      <section className="stat-grid">
        {cards.map((card) => { const Icon = card.icon; return (
          <article className="stat-card" key={card.label}>
            <div className={`stat-icon ${card.color}`}><Icon size={20} /></div>
            <span className="more"><MoreHorizontal size={19} /></span>
            <p>{card.label}</p><h2>{card.value}</h2>
            <small className={card.trend}>{card.trend === 'up' ? <ArrowUpRight size={14} /> : <AlertTriangle size={14} />}{card.note}</small>
          </article>
        ) })}
      </section>
      <section className="dashboard-grid">
        <article className="panel chart-panel wide">
          <PanelHead title="Revenue & profit" subtitle="Sales performance across all channels"><button className="mini-select" onClick={() => setRangeIndex((rangeIndex + 1) % ranges.length)}>{ranges[rangeIndex]} <ChevronDown size={14} /></button></PanelHead>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6d5dfc" stopOpacity={0.3}/><stop offset="95%" stopColor="#6d5dfc" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--surface)' }} formatter={(v) => money(v)} />
                <Area type="monotone" dataKey="sales" stroke="#6d5dfc" strokeWidth={3} fill="url(#salesFill)" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="panel channel-panel">
          <PanelHead title="Sales by channel" subtitle="Revenue contribution" />
          <div className="donut-wrap">
            <ResponsiveContainer width="100%" height={205}>
              <PieChart><Pie data={categoryData} dataKey="value" innerRadius={60} outerRadius={82} paddingAngle={3}>{categoryData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="donut-label"><strong>$31.8k</strong><span>Total sales</span></div>
          </div>
          <div className="legend-list">{categoryData.map((entry) => <div key={entry.name}><span><i style={{ background: entry.color }} />{entry.name}</span><strong>{entry.value}%</strong></div>)}</div>
        </article>
        <article className="panel orders-panel wide">
          <PanelHead title="Recent orders" subtitle="Latest transactions across your business"><NavLink to="/orders" className="text-link">View all <ArrowRight size={15} /></NavLink></PanelHead>
          <div className="responsive-table compact-table">
            <table><thead><tr><th>Order</th><th>Customer</th><th>Channel</th><th>Payment</th><th>Total</th><th>Status</th></tr></thead>
              <tbody>{data.orders.slice(0, 5).map((order) => <tr key={order.id}><td><strong>{order.id}</strong></td><td>{order.customer}</td><td>{order.channel}</td><td>{order.payment}</td><td><strong>{money(order.total)}</strong></td><td><Status value={order.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </article>
        <article className="panel activity-panel">
          <PanelHead title="Business pulse" subtitle="Live operational signals" />
          <div className="pulse-score"><div><IndustryIcon size={25} /></div><span><strong>92</strong><small>Health score</small></span><em>Excellent</em></div>
          <div className="activity-list">
            <div><span className="activity-icon green"><ShoppingCart size={16} /></span><p><strong>42 sales today</strong><small>Across 3 active channels</small></p><time>Live</time></div>
            <div><span className="activity-icon orange"><AlertTriangle size={16} /></span><p><strong>{lowStock} stock alerts</strong><small>Reorder suggestions ready</small></p><time>Now</time></div>
            <div><span className="activity-icon blue"><Cloud size={16} /></span><p><strong>All systems synced</strong><small>No pending conflicts</small></p><time>1m</time></div>
          </div>
        </article>
      </section>
    </>
  )
}

function CalendarIcon() {
  return <Clock3 size={17} />
}

function PanelHead({ title, subtitle, children }) {
  return <div className="panel-head"><div><h3>{title}</h3>{subtitle && <p>{subtitle}</p>}</div>{children}</div>
}

function PointOfSale({ store, token, connection }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All items')
  const [cart, setCart] = useState([])
  const [customer, setCustomer] = useState('')
  const [discount, setDiscount] = useState(0)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [receipt, setReceipt] = useState(null)
  const [heldOpen, setHeldOpen] = useState(false)
  const categories = ['All items', 'Popular', 'Retail', 'Memberships', 'Services']
  const products = store.data.products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(query.toLowerCase()) || product.sku.toLowerCase().includes(query.toLowerCase())
    const categoryName = product.category.toLowerCase()
    const matchesCategory = category === 'All items'
      || (category === 'Popular' && (product.stock > 20 || product.stock > 900))
      || (category === 'Memberships' && categoryName.includes('membership'))
      || (category === 'Services' && categoryName.includes('service'))
      || (category === 'Retail' && !categoryName.includes('membership') && !categoryName.includes('service'))
    return matchesSearch && matchesCategory
  })
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const discountAmount = subtotal * (discount / 100)
  const tax = (subtotal - discountAmount) * 0.08
  const total = subtotal - discountAmount + tax

  const add = (product) => setCart((items) => {
    const current = items.find((item) => item.id === product.id)
    return current ? items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...items, { ...product, qty: 1 }]
  })
  const changeQty = (id, amount) => setCart((items) => items.map((item) => item.id === id ? { ...item, qty: Math.max(0, item.qty + amount) } : item).filter((item) => item.qty > 0))
  const hold = () => {
    if (!cart.length) {
      setHeldOpen(true)
      return
    }
    store.update((data) => ({ ...data, heldCarts: [...data.heldCarts, { id: `HOLD-${Date.now().toString().slice(-4)}`, cart, customer, total }]}))
    setCart([])
    setCustomer('')
    notify('Sale held successfully.')
  }
  const restoreCart = (held) => {
    setCart(held.cart)
    setCustomer(held.customer)
    store.update((data) => ({ ...data, heldCarts: data.heldCarts.filter((item) => item.id !== held.id) }))
    setHeldOpen(false)
    notify(`${held.id} restored.`)
  }
  const finishSale = async (method) => {
    const id = `ORD-${1090 + store.data.sales.length}`
    const order = { id, customer: customer || 'Walk-in customer', channel: 'In store', location: 'Downtown', total, payment: method, status: 'Completed', date: now() }
    const eventId = crypto.randomUUID()
    const idempotencyKey = `sale:${eventId}`
    const cloudPayload = {
      id: eventId,
      orderNumber: id,
      channel: 'in_store',
      paymentMethod: method.toLowerCase(),
      discount: discountAmount,
      tax,
      occurredAt: new Date().toISOString(),
      items: cart.map((item) => ({ productId: item.id, quantity: item.qty })),
    }
    if (connection === 'online' && token) {
      try {
        await cloudApi.createOrder(token, cloudPayload, idempotencyKey)
      } catch {
        await queueEvent({
          eventId, idempotencyKey, entityType: 'order', entityId: eventId,
          operation: 'created', occurredAt: cloudPayload.occurredAt,
          payload: { ...cloudPayload, total },
        })
        notify('Cloud submission failed. The sale was saved to the offline queue.', 'warning')
      }
    } else {
      await queueEvent({
        eventId, idempotencyKey, entityType: 'order', entityId: eventId,
        operation: 'created', occurredAt: cloudPayload.occurredAt,
        payload: { ...cloudPayload, total },
      })
      notify('Sale saved offline and will synchronize automatically.')
    }
    store.update((data) => ({
      ...data,
      sales: [...data.sales, order],
      orders: [order, ...data.orders],
      products: data.products.map((product) => {
        const item = cart.find((line) => line.id === product.id)
        return item && product.stock < 900 ? { ...product, stock: Math.max(0, product.stock - item.qty) } : product
      }),
    }))
    setReceipt({ ...order, items: cart, subtotal, discountAmount, tax })
    setCart([])
    setPaymentOpen(false)
  }

  return (
    <div className="pos-page">
      <div className="pos-head">
        <div><span className="live-dot" /> <strong>Counter C001</strong><small>Session opened 2h 14m ago</small></div>
        <div className="pos-title"><ShoppingCart size={19} /> Register</div>
        <div><button className="secondary-btn" onClick={hold}><Clock3 size={16} /> {cart.length ? 'Hold sale' : 'Held sales'} ({store.data.heldCarts.length})</button><button className="icon-btn" title="Register actions" onClick={() => notify('Register is online and the cash drawer is balanced.')}><MoreHorizontal size={19} /></button></div>
      </div>
      <div className="pos-layout">
        <section className="product-browser">
          <div className="pos-search"><Search size={20} /><input autoFocus placeholder="Scan barcode or search products and services..." value={query} onChange={(e) => setQuery(e.target.value)} /><kbd>F2</kbd></div>
          <div className="category-chips">{categories.map((item) => <button className={category === item ? 'active' : ''} key={item} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="product-grid">
            {products.map((product, index) => (
              <button className="product-card" key={product.id} onClick={() => add(product)}>
                <span className={`product-art art-${index % 6}`}><Box size={28} /></span>
                <span><strong>{product.name}</strong><small>{product.sku}</small></span>
                <span className="product-meta"><strong>{money(product.price)}</strong><small className={product.stock <= product.reorder ? 'low' : ''}>{product.stock > 900 ? 'Available' : `${product.stock} in stock`}</small></span>
              </button>
            ))}
          </div>
        </section>
        <aside className="cart-panel">
          <div className="cart-header"><div><h2>Current order</h2><p>{cart.reduce((sum, item) => sum + item.qty, 0)} items</p></div>{cart.length > 0 && <button onClick={() => setCart([])}>Clear</button>}</div>
          <label className="customer-select"><Users size={17} /><select value={customer} onChange={(e) => setCustomer(e.target.value)}><option value="">Walk-in customer</option>{store.data.customers.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select><ChevronDown size={16} /></label>
          <div className="cart-lines">
            {!cart.length && <div className="empty-cart"><span><ShoppingBag size={30} /></span><h3>Your cart is empty</h3><p>Scan a barcode or select an item to start a sale.</p></div>}
            {cart.map((item) => <div className="cart-line" key={item.id}><span className="line-art"><Box size={19} /></span><div><strong>{item.name}</strong><small>{money(item.price)} each</small><div className="qty-control"><button onClick={() => changeQty(item.id, -1)}><Minus size={13} /></button><span>{item.qty}</span><button onClick={() => changeQty(item.id, 1)}><Plus size={13} /></button></div></div><strong>{money(item.price * item.qty)}</strong><button className="line-delete" onClick={() => setCart((items) => items.filter((line) => line.id !== item.id))}><Trash2 size={15} /></button></div>)}
          </div>
          <div className="cart-summary">
            <div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
            <div className="discount-line"><span>Discount</span><label><input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />%</label><strong>-{money(discountAmount)}</strong></div>
            <div><span>Tax (8%)</span><strong>{money(tax)}</strong></div>
            <div className="grand-total"><span>Total</span><strong>{money(total)}</strong></div>
          </div>
          <button className="pay-btn" disabled={!cart.length} onClick={() => setPaymentOpen(true)}><LockKeyhole size={18} /><span>Charge {money(total)}</span><kbd>F4</kbd></button>
          <div className="cart-shortcuts"><span><kbd>F6</kbd> Customer</span><span><kbd>F8</kbd> Discount</span><span><kbd>Esc</kbd> Cancel</span></div>
        </aside>
      </div>
      {paymentOpen && <PaymentModal total={total} close={() => setPaymentOpen(false)} finish={finishSale} />}
      {receipt && <ReceiptModal receipt={receipt} close={() => setReceipt(null)} />}
      {heldOpen && <HeldSalesModal heldCarts={store.data.heldCarts} restore={restoreCart} close={() => setHeldOpen(false)} />}
    </div>
  )
}

function PaymentModal({ total, close, finish }) {
  const [method, setMethod] = useState('Card')
  const [tendered, setTendered] = useState(total.toFixed(2))
  const methods = [['Cash', BankIcon], ['Card', WalletCards], ['Wallet', SmartphoneIcon], ['Split', ArrowLeftRight]]
  return (
    <Modal title="Complete payment" subtitle="Choose a tender and confirm the transaction." close={close}>
      <div className="payment-total"><span>Amount due</span><strong>{money(total)}</strong></div>
      <div className="payment-methods">{methods.map(([name, Icon]) => <button className={method === name ? 'active' : ''} key={name} onClick={() => setMethod(name)}><Icon size={22} /><strong>{name}</strong><small>{name === 'Card' ? 'Terminal ready' : name === 'Cash' ? 'Cash drawer' : 'Secure payment'}</small></button>)}</div>
      <Field label={method === 'Cash' ? 'Amount tendered' : 'Payment amount'}><div className="money-input"><span>$</span><input type="number" value={tendered} onChange={(e) => setTendered(e.target.value)} /></div></Field>
      {method === 'Cash' && <div className="change-due"><span>Change due</span><strong>{money(Math.max(0, Number(tendered) - total))}</strong></div>}
      <div className="modal-actions"><button className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" onClick={() => finish(method)}><Check size={17} /> Confirm {method} payment</button></div>
    </Modal>
  )
}

function BankIcon(props) { return <Landmark {...props} /> }
function SmartphoneIcon(props) { return <Globe2 {...props} /> }

function ReceiptModal({ receipt, close }) {
  return (
    <Modal title="Payment successful" subtitle={`${receipt.id} has been completed.`} close={close}>
      <div className="success-mark"><Check size={28} /></div>
      <div className="receipt-preview">
        <Logo />
        <p>Nexora Demo Store<br />Downtown flagship</p>
        <hr />
        {receipt.items.map((item) => <div key={item.id}><span>{item.qty} × {item.name}</span><strong>{money(item.qty * item.price)}</strong></div>)}
        <hr /><div><span>Subtotal</span><strong>{money(receipt.subtotal)}</strong></div><div><span>Tax</span><strong>{money(receipt.tax)}</strong></div><div className="receipt-total"><span>Total</span><strong>{money(receipt.total)}</strong></div>
        <small>Paid by {receipt.payment} · {new Date().toLocaleString()}</small>
      </div>
      <div className="modal-actions"><button className="secondary-btn" onClick={async () => { await hardware.printReceipt(receipt); notify('Receipt sent to the configured print service.') }}><Printer size={17} /> Print</button><button className="secondary-btn" onClick={() => notify('Receipt email queued for the selected customer.')}><ReceiptText size={17} /> Email receipt</button><button className="primary-btn" onClick={close}>New sale</button></div>
    </Modal>
  )
}

function HeldSalesModal({ heldCarts, restore, close }) {
  return (
    <Modal title="Held sales" subtitle="Resume a suspended cart at this register." close={close}>
      <div className="held-list">
        {!heldCarts.length && <EmptyState icon={Clock3} title="No held sales" text="Hold an active cart and it will appear here." />}
        {heldCarts.map((held) => <button key={held.id} onClick={() => restore(held)}><span><strong>{held.id}</strong><small>{held.customer || 'Walk-in customer'} · {held.cart.length} lines</small></span><strong>{money(held.total)}</strong><ChevronRight size={17} /></button>)}
      </div>
    </Modal>
  )
}

function Modal({ title, subtitle, close, children, wide = false }) {
  return <div className="modal-backdrop" onMouseDown={close}><div className={`modal ${wide ? 'modal-wide' : ''}`} onMouseDown={(e) => e.stopPropagation()}><div className="modal-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button className="icon-btn" onClick={close}><X size={20} /></button></div>{children}</div></div>
}

function OrdersPage({ store }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('All')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [showFilters, setShowFilters] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const orders = store.data.orders.filter((order) => (status === 'All' || order.status === status)
    && (locationFilter === 'All locations' || order.location === locationFilter)
    && (order.id.toLowerCase().includes(query.toLowerCase()) || order.customer.toLowerCase().includes(query.toLowerCase())))
  const importOrders = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text())
      const imported = Array.isArray(parsed) ? parsed : [parsed]
      store.update((data) => ({ ...data, orders: [...imported, ...data.orders] }))
      notify(`${imported.length} orders imported.`)
    } catch {
      notify('Import failed. Use a JSON file containing an order array.', 'danger')
    }
    event.target.value = ''
  }
  const createOrder = (order) => {
    store.update((data) => ({ ...data, orders: [order, ...data.orders] }))
    setCreateOpen(false)
    notify(`${order.id} created.`)
  }
  return (
    <>
      <PageHeader eyebrow="Sales" title="Orders" description="Manage in-store, online, click-and-collect, delivery, returns and refunds.">
        <label className="secondary-btn file-action"><Upload size={17} /> Import JSON<input type="file" accept=".json,application/json" onChange={importOrders} /></label><button className="primary-btn" onClick={() => setCreateOpen(true)}><Plus size={17} /> Create order</button>
      </PageHeader>
      <div className="mini-stats">
        <div><span>Today’s orders</span><strong>42</strong><small className="positive"><ArrowUpRight size={13} /> 8.2%</small></div>
        <div><span>Processing</span><strong>8</strong><small>Needs attention</small></div>
        <div><span>Ready for pickup</span><strong>5</strong><small>Across 2 locations</small></div>
        <div><span>Returns</span><strong>3</strong><small>1.4% return rate</small></div>
      </div>
      <section className="panel table-panel">
        <div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder="Search order or customer..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><div className="status-tabs">{['All', 'Completed', 'Processing', 'Ready', 'Refunded'].map((item) => <button className={status === item ? 'active' : ''} key={item} onClick={() => setStatus(item)}>{item}</button>)}</div><button className={`secondary-btn ${showFilters ? 'active-filter' : ''}`} onClick={() => setShowFilters(!showFilters)}><Filter size={16} /> Filters</button></div>
        {showFilters && <div className="filter-strip"><label>Location<select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)}><option>All locations</option><option>Downtown</option><option>Westside</option><option>Web store</option></select></label><button className="text-btn" onClick={() => { setStatus('All'); setLocationFilter('All locations'); setQuery('') }}>Clear filters</button></div>}
        <div className="responsive-table"><table><thead><tr><th>Order</th><th>Date</th><th>Customer</th><th>Channel</th><th>Location</th><th>Payment</th><th>Total</th><th>Status</th><th /></tr></thead><tbody>
          {orders.map((order) => <tr key={order.id} onClick={() => setSelected(order)}><td><strong>{order.id}</strong></td><td>{order.date}</td><td>{order.customer}</td><td>{order.channel}</td><td>{order.location}</td><td>{order.payment}</td><td><strong>{money(order.total)}</strong></td><td><Status value={order.status} /></td><td><button className="icon-btn" title={`Open ${order.id}`} onClick={(event) => { event.stopPropagation(); setSelected(order) }}><ChevronRight size={17} /></button></td></tr>)}
        </tbody></table></div>
        <TableFooter count={orders.length} />
      </section>
      {selected && <OrderDetail order={selected} store={store} close={() => setSelected(null)} />}
      {createOpen && <CreateOrderModal customers={store.data.customers} save={createOrder} close={() => setCreateOpen(false)} />}
    </>
  )
}

function OrderDetail({ order, store, close }) {
  const markReturned = () => {
    store.update((data) => ({ ...data, orders: data.orders.map((item) => item.id === order.id ? { ...item, status: 'Refunded' } : item) }))
    notify(`${order.id} marked as refunded.`)
    close()
  }
  return (
    <Modal wide title={order.id} subtitle={`Created ${order.date} via ${order.channel}`} close={close}>
      <div className="detail-grid"><div><span>Customer</span><strong>{order.customer}</strong></div><div><span>Location</span><strong>{order.location}</strong></div><div><span>Payment</span><strong>{order.payment}</strong></div><div><span>Status</span><Status value={order.status} /></div></div>
      <div className="detail-section"><h3>Order timeline</h3><div className="timeline"><div className="done"><i><Check size={13} /></i><span><strong>Order created</strong><small>{order.date} · 10:24 AM</small></span></div><div className="done"><i><Check size={13} /></i><span><strong>Payment authorized</strong><small>{order.payment} · {money(order.total)}</small></span></div><div><i /><span><strong>Fulfillment completed</strong><small>Downtown flagship</small></span></div></div></div>
      <div className="modal-actions"><button className="secondary-btn" onClick={() => window.print()}><Printer size={16} /> Print</button><button className="secondary-btn" onClick={markReturned}><Undo2 size={16} /> Return items</button><button className="primary-btn" onClick={() => downloadCsv(`${order.id}-invoice.csv`, ['Order', 'Customer', 'Payment', 'Total', 'Status'], [[order.id, order.customer, order.payment, order.total, order.status]])}>Download invoice</button></div>
    </Modal>
  )
}

function CreateOrderModal({ customers, save, close }) {
  const [customer, setCustomer] = useState(customers[0]?.name || 'Walk-in customer')
  const [total, setTotal] = useState('')
  const [channel, setChannel] = useState('In store')
  const submit = (event) => {
    event.preventDefault()
    save({ id: `ORD-${Date.now().toString().slice(-6)}`, customer, channel, location: channel === 'Online' ? 'Web store' : 'Downtown', total: Number(total), payment: 'Pending', status: 'Processing', date: now() })
  }
  return (
    <Modal title="Create order" subtitle="Add a manual order for phone, online, or counter sales." close={close}>
      <form onSubmit={submit}>
        <Field label="Customer"><select value={customer} onChange={(event) => setCustomer(event.target.value)}><option>Walk-in customer</option>{customers.map((item) => <option key={item.id}>{item.name}</option>)}</select></Field>
        <Field label="Channel"><select value={channel} onChange={(event) => setChannel(event.target.value)}><option>In store</option><option>Online</option><option>Click & collect</option><option>Delivery</option></select></Field>
        <Field label="Order total"><input required min="0" step="0.01" type="number" value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0.00" /></Field>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" type="submit"><Check size={17} /> Create order</button></div>
      </form>
    </Modal>
  )
}

function ModulePage({ moduleKey, store }) {
  const config = moduleConfigs[moduleKey]
  const storageKey = `nexora-module-${moduleKey}`
  const [rows, setRows] = useState(() => {
    if (config.source === 'products') return store.data.products.map((item) => config.columns.map((column) => item[column]))
    if (config.source === 'customers') return store.data.customers.map((item) => config.columns.map((column) => item[column]))
    try {
      return JSON.parse(localStorage.getItem(storageKey)) || getSampleRows(moduleKey)
    } catch {
      return getSampleRows(moduleKey)
    }
  })
  const [query, setQuery] = useState('')
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [showAllColumns, setShowAllColumns] = useState(true)
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editIndex, setEditIndex] = useState(null)
  const Icon = config.icon
  const visibleColumnIndexes = config.columns.map((_, index) => index).filter((index) => showAllColumns || index < 5 || index === config.columns.length - 1)
  const filtered = rows.map((row, sourceIndex) => ({ row, sourceIndex })).filter(({ row }) => {
    const matchesSearch = row.some((value) => String(value).toLowerCase().includes(query.toLowerCase()))
    const statusText = String(row[row.length - 1]).toLowerCase()
    const needsAttention = ['low', 'pending', 'review', 'partial', 'attention', 'reorder', 'processing'].some((value) => statusText.includes(value))
    return matchesSearch && (!attentionOnly || needsAttention)
  })
  const pageSize = 6
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const displayed = filtered.slice((page - 1) * pageSize, page * pageSize)
  useEffect(() => setPage(1), [query, attentionOnly])
  useEffect(() => {
    if (page > pageCount) setPage(pageCount)
  }, [page, pageCount])
  const openCreate = () => { setEditIndex(null); setModalOpen(true) }
  useEffect(() => {
    if (!config.source) localStorage.setItem(storageKey, JSON.stringify(rows))
  }, [config.source, rows, storageKey])
  const commitRows = (next) => {
    setRows(next)
    if (config.source === 'products') {
      store.update((data) => ({
        ...data,
        products: next.map((row, index) => {
          const existing = data.products.find((item) => item.sku === row[1])
          return {
            id: existing?.id || `PRD-${Date.now().toString().slice(-6)}-${index}`,
            name: row[0], sku: row[1], category: row[2], price: Number(row[3]) || 0,
            cost: existing?.cost || 0, stock: Number(row[4]) || 0, reorder: existing?.reorder || 5,
            channel: row[5], status: row[6],
          }
        }),
      }))
    }
    if (config.source === 'customers') {
      store.update((data) => ({
        ...data,
        customers: next.map((row, index) => {
          const existing = data.customers.find((item) => item.email === row[1])
          return {
            id: existing?.id || `CUS-${Date.now().toString().slice(-6)}-${index}`,
            name: row[0], email: row[1], phone: row[2], segment: row[3],
            points: Number(row[4]) || 0, spent: Number(row[5]) || 0, status: row[6],
          }
        }),
      }))
    }
  }
  const save = (values) => {
    const next = editIndex === null ? [[...values], ...rows] : rows.map((row, index) => index === editIndex ? values : row)
    commitRows(next)
    setModalOpen(false)
    notify(`Record ${editIndex === null ? 'created' : 'updated'}.`)
  }
  const remove = (index) => {
    commitRows(rows.filter((_, rowIndex) => rowIndex !== index))
    notify('Record deleted.')
  }
  return (
    <>
      <PageHeader eyebrow="Operations" title={config.title} description={config.subtitle}>
        <button className="secondary-btn" onClick={() => downloadCsv(`${moduleKey}.csv`, config.columns.map(pretty), rows)}><FileDown size={17} /> Export</button><button className="primary-btn" onClick={openCreate}><Plus size={17} /> {config.action}</button>
      </PageHeader>
      <div className="mini-stats module-stats">
        <div><span>Total records</span><strong>{rows.length}</strong><small>Across all locations</small></div>
        <div><span>Active</span><strong>{Math.max(rows.length - 1, 0)}</strong><small className="positive"><ArrowUpRight size={13} /> Healthy</small></div>
        <div><span>Needs attention</span><strong>{rows.length ? 1 : 0}</strong><small>Review recommended</small></div>
        <div><span>Last update</span><strong className="smaller">Just now</strong><small>Cloud synchronized</small></div>
      </div>
      <section className="panel table-panel">
        <div className="table-context"><div className="context-icon"><Icon size={20} /></div><div><strong>{config.title}</strong><p>Search, filter, edit, export and manage detailed records.</p></div></div>
        <div className="table-toolbar"><div className="search-box"><Search size={17} /><input placeholder={`Search ${config.title.toLowerCase()}...`} value={query} onChange={(e) => setQuery(e.target.value)} /></div><button className={`secondary-btn ${attentionOnly ? 'active-filter' : ''}`} onClick={() => setAttentionOnly(!attentionOnly)}><Filter size={16} /> Needs attention</button><button className={`secondary-btn ${!showAllColumns ? 'active-filter' : ''}`} onClick={() => setShowAllColumns(!showAllColumns)}><Grid2X2 size={16} /> {showAllColumns ? 'Compact columns' : 'All columns'}</button></div>
        <div className="responsive-table"><table><thead><tr>{visibleColumnIndexes.map((index) => <th key={config.columns[index]}>{pretty(config.columns[index])}</th>)}<th>Actions</th></tr></thead>
          <tbody>{displayed.map(({ row, sourceIndex }) => <tr key={`${row[0]}-${sourceIndex}`}>{visibleColumnIndexes.map((cellIndex) => { const value = row[cellIndex]; return <td key={cellIndex}>{cellIndex === 0 ? <strong>{formatValue(value)}</strong> : cellIndex === row.length - 1 ? <Status value={String(value)} /> : formatValue(value)}</td> })}<td><div className="row-actions"><button title="Edit record" onClick={() => { setEditIndex(sourceIndex); setModalOpen(true) }}><Pencil size={15} /></button><button title="Delete record" className="danger" onClick={() => remove(sourceIndex)}><Trash2 size={15} /></button></div></td></tr>)}</tbody>
        </table></div>
        {!filtered.length && <EmptyState icon={Icon} title="No matching records" text="Try another search or create a new record." />}
        <TableFooter count={filtered.length} page={page} pageCount={pageCount} setPage={setPage} />
      </section>
      {modalOpen && <RecordModal config={config} values={editIndex === null ? null : rows[editIndex]} close={() => setModalOpen(false)} save={save} />}
    </>
  )
}

function RecordModal({ config, values, close, save }) {
  const [form, setForm] = useState(() => config.columns.map((column, index) => values?.[index] ?? (column === 'status' ? 'Active' : '')))
  const submit = (event) => { event.preventDefault(); save(form.map((value) => value === '' ? '—' : value)) }
  return (
    <Modal wide title={values ? `Edit ${config.title}` : config.action} subtitle="Complete the fields below. Changes are reflected immediately in this workspace." close={close}>
      <form onSubmit={submit}>
        <div className="form-grid">{config.columns.map((column, index) => <Field key={column} label={pretty(column)}><input required={index === 0} value={form[index]} onChange={(e) => setForm((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} placeholder={`Enter ${pretty(column).toLowerCase()}`} /></Field>)}</div>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" type="submit"><Check size={17} /> Save record</button></div>
      </form>
    </Modal>
  )
}

function ReportsPage() {
  const [selected, setSelected] = useState(null)
  const [action, setAction] = useState(null)
  return (
    <>
      <PageHeader eyebrow="Intelligence" title="Reports & analytics" description="Turn sales, stock, customer and workforce data into decisions.">
        <button className="secondary-btn" onClick={() => setAction('schedule')}><Clock3 size={17} /> Schedules</button><button className="primary-btn" onClick={() => setAction('custom')}><Plus size={17} /> Custom report</button>
      </PageHeader>
      <section className="report-hero panel">
        <div><span className="eyebrow"><Sparkles size={14} /> Smart insight</span><h2>Revenue is forecast to grow 9.8% this month</h2><p>Weekend sales and online conversion are driving the strongest gains. Hydration Bottle needs replenishment before Friday.</p><button className="text-link" onClick={() => setSelected({ title: 'Demand forecast', text: 'Projected sales, stock demand, and replenishment guidance.' })}>Open forecast <ArrowRight size={15} /></button></div>
        <div className="forecast-bars"><i style={{ height: '42%' }} /><i style={{ height: '58%' }} /><i style={{ height: '51%' }} /><i style={{ height: '73%' }} /><i style={{ height: '67%' }} /><i style={{ height: '86%' }} /><i className="future" style={{ height: '95%' }} /></div>
      </section>
      <div className="report-grid">
        {reportCards.map(([title, text, Icon]) => <button className="report-card panel" key={title} onClick={() => setSelected({ title, text })}><span><Icon size={21} /></span><div><strong>{title}</strong><p>{text}</p></div><ChevronRight size={18} /></button>)}
      </div>
      {selected && <ReportDetail report={selected} close={() => setSelected(null)} />}
      {action && <ReportActionModal type={action} close={() => setAction(null)} />}
    </>
  )
}

function ReportDetail({ report, close }) {
  const [period, setPeriod] = useState('Last 30 days')
  const [location, setLocation] = useState('All locations')
  return (
    <Modal wide title={report.title} subtitle={report.text} close={close}>
      <div className="report-controls"><select className="secondary-select" value={period} onChange={(event) => setPeriod(event.target.value)}><option>Last 7 days</option><option>Last 30 days</option><option>This quarter</option></select><select className="secondary-select" value={location} onChange={(event) => setLocation(event.target.value)}><option>All locations</option><option>Downtown</option><option>Westside</option></select><button className="secondary-btn" onClick={() => downloadCsv(`${report.title.toLowerCase().replaceAll(' ', '-')}.csv`, ['Day', 'Sales', 'Profit'], salesTrend.map((item) => [item.name, item.sales, item.profit]))}><Download size={16} /> Export</button></div>
      <div className="detail-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={salesTrend}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Legend /><Bar dataKey="sales" fill="#6d5dfc" radius={[5,5,0,0]} /><Bar dataKey="profit" fill="#10b981" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div>
      <div className="detail-grid"><div><span>Total</span><strong>$62,000</strong></div><div><span>Average</span><strong>$8,857</strong></div><div><span>Change</span><strong className="positive">+12.4%</strong></div><div><span>Best day</span><strong>Saturday</strong></div></div>
    </Modal>
  )
}

function ReportActionModal({ type, close }) {
  const [name, setName] = useState(type === 'schedule' ? 'Weekly management report' : 'My custom report')
  const submit = (event) => {
    event.preventDefault()
    notify(type === 'schedule' ? `${name} scheduled.` : `${name} created.`)
    close()
  }
  return (
    <Modal title={type === 'schedule' ? 'Schedule report' : 'Create custom report'} subtitle={type === 'schedule' ? 'Choose when this report should be generated.' : 'Build a reusable report definition.'} close={close}>
      <form onSubmit={submit}>
        <Field label="Report name"><input required value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label={type === 'schedule' ? 'Frequency' : 'Primary metric'}><select><option>{type === 'schedule' ? 'Every Monday' : 'Net sales'}</option><option>{type === 'schedule' ? 'Daily' : 'Gross profit'}</option><option>{type === 'schedule' ? 'Monthly' : 'Inventory value'}</option></select></Field>
        <div className="modal-actions"><button type="button" className="secondary-btn" onClick={close}>Cancel</button><button className="primary-btn" type="submit"><Check size={17} /> Save</button></div>
      </form>
    </Modal>
  )
}

function SettingsPage({ industry, setIndustry, store, token, connection }) {
  const [saved, setSaved] = useState(false)
  const [active, setActive] = useState('Business profile')
  const [offline, setOffline] = useState(() => localStorage.getItem('nexora-offline') !== 'false')
  const [managerApproval, setManagerApproval] = useState(() => localStorage.getItem('nexora-manager-approval') !== 'false')
  const [pendingCount, setPendingCount] = useState(0)
  const [conflicts, setConflicts] = useState([])
  const settingsTabs = [['Business profile', Store], ['Checkout', ShoppingCart], ['Taxes & receipts', ReceiptText], ['Security', ShieldCheck], ['Offline & sync', Cloud], ['Notifications', Bell]]
  const save = () => {
    localStorage.setItem('nexora-offline', String(offline))
    localStorage.setItem('nexora-manager-approval', String(managerApproval))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }
  useEffect(() => {
    Promise.all([pendingEvents(), getConflicts()]).then(([events, storedConflicts]) => {
      setPendingCount(events.length)
      setConflicts(storedConflicts)
    })
  }, [active])
  const synchronize = async () => {
    if (!token || connection !== 'online') {
      notify('The cloud is unavailable. Pending records remain safely stored offline.', 'danger')
      return
    }
    try {
      const result = await syncOutbox(token, cloudApi)
      setPendingCount((await pendingEvents()).length)
      setConflicts(await getConflicts())
      notify(`Synchronization completed. ${result.accepted} queued records uploaded.`)
    } catch {
      notify('Synchronization failed. Records remain in the offline queue.', 'danger')
    }
  }
  return (
    <>
      <PageHeader eyebrow="Administration" title="Settings" description="Configure business identity, checkout, tax, receipt, security and offline behavior.">
        <button className="primary-btn" onClick={save}><Check size={17} /> Save changes</button>
      </PageHeader>
      {saved && <div className="success-banner"><Check size={17} /> Settings saved successfully.</div>}
      <div className="settings-layout">
        <aside className="settings-nav panel">{settingsTabs.map(([name, Icon]) => <button className={active === name ? 'active' : ''} key={name} onClick={() => setActive(name)}><Icon size={17} /> {name}</button>)}</aside>
        <section className="panel settings-content">
          {active === 'Business profile' ? <>
          <PanelHead title="Business profile" subtitle="Core identity and default operating mode." />
          <div className="profile-upload"><span><Store size={28} /></span><div><strong>Business logo</strong><p>PNG, JPG or SVG. Recommended 512 x 512.</p><label className="secondary-btn file-action">Upload logo<input type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && notify(`${event.target.files[0].name} selected as the business logo.`)} /></label></div></div>
          <div className="form-grid"><Field label="Business name"><input defaultValue="Nexora Demo Store" /></Field><Field label="Legal name"><input defaultValue="Nexora Commerce LLC" /></Field><Field label="Support email"><input defaultValue="hello@nexorapos.com" /></Field><Field label="Phone"><input defaultValue="+1 555 0100" /></Field><Field label="Default currency"><select defaultValue="USD"><option>USD</option><option>PKR</option><option>GBP</option><option>EUR</option></select></Field><Field label="Timezone"><select defaultValue="America/New_York"><option>America/New_York</option><option>Asia/Karachi</option><option>Europe/London</option></select></Field></div>
          <div className="setting-section"><h3>Industry configuration</h3><p>Changes the terminology, shortcuts and recommended workflows.</p><div className="industry-cards">{Object.entries(industries).map(([key, item]) => { const Icon = item.icon; return <button className={industry === key ? 'active' : ''} key={key} onClick={() => setIndustry(key)}><Icon size={22} /><span><strong>{item.label}</strong><small>{key === 'gym' ? 'Memberships and classes' : key === 'ecommerce' ? 'Orders and fulfillment' : key === 'services' ? 'Bookings and services' : 'Products and inventory'}</small></span>{industry === key && <Check size={17} />}</button> })}</div></div>
          <div className="setting-section"><h3>Reliability</h3><div className="toggle-row"><span className="setting-icon"><CloudOff size={20} /></span><div><strong>Offline selling</strong><p>Cache catalog and queue cash transactions when internet is unavailable.</p></div><button className={`toggle ${offline ? 'on' : ''}`} onClick={() => setOffline(!offline)}><i /></button></div><div className="toggle-row"><span className="setting-icon"><ShieldCheck size={20} /></span><div><strong>Manager approval for overrides</strong><p>Require a PIN for refunds, large discounts and price overrides.</p></div><button className={`toggle ${managerApproval ? 'on' : ''}`} onClick={() => setManagerApproval(!managerApproval)}><i /></button></div></div>
          <div className="danger-zone"><div><strong>Reset demonstration data</strong><p>Restore products, customers, orders and notifications to their defaults.</p></div><button className="danger-btn" onClick={() => { store.reset(); notify('Demonstration data reset.') }}><RefreshCw size={16} /> Reset data</button></div>
          </> : <SettingsTabContent active={active} offline={offline} setOffline={setOffline} managerApproval={managerApproval} setManagerApproval={setManagerApproval} pendingCount={pendingCount} synchronize={synchronize} connection={connection} conflicts={conflicts} setConflicts={setConflicts} />}
        </section>
      </div>
    </>
  )
}

function SettingsTabContent({ active, offline, setOffline, managerApproval, setManagerApproval, pendingCount, synchronize, connection, conflicts, setConflicts }) {
  if (active === 'Checkout') return <><PanelHead title="Checkout" subtitle="Configure register behavior and payment defaults." /><div className="form-grid"><Field label="Default tax rate"><input type="number" defaultValue="8" /></Field><Field label="Default payment"><select><option>Card</option><option>Cash</option><option>Wallet</option></select></Field><Field label="Receipt mode"><select><option>Print and email</option><option>Print only</option><option>Digital only</option></select></Field><Field label="Rounding"><select><option>No rounding</option><option>Nearest 0.05</option></select></Field></div><SettingToggle icon={ShieldCheck} title="Manager approval for overrides" text="Require a PIN for refunds, large discounts and price overrides." value={managerApproval} setValue={setManagerApproval} /></>
  if (active === 'Taxes & receipts') return <><PanelHead title="Taxes & receipts" subtitle="Set tax identity and receipt content." /><div className="form-grid"><Field label="Tax registration number"><input defaultValue="TAX-928401" /></Field><Field label="Tax mode"><select><option>Tax exclusive</option><option>Tax inclusive</option></select></Field><Field label="Receipt footer"><input defaultValue="Thank you for shopping with us." /></Field><Field label="Invoice prefix"><input defaultValue="INV-" /></Field></div></>
  if (active === 'Security') return <><PanelHead title="Security" subtitle="Protect sensitive actions and staff access." /><SettingToggle icon={ShieldCheck} title="Manager approval" text="Require approval for refunds, voids and price overrides." value={managerApproval} setValue={setManagerApproval} /><SettingToggle icon={LockKeyhole} title="Automatic screen lock" text="Lock inactive registers after five minutes." value={true} setValue={() => notify('Automatic lock remains enabled.')} /></>
  if (active === 'Offline & sync') return <><PanelHead title="Offline & sync" subtitle="Keep branches selling during network interruptions." /><SettingToggle icon={CloudOff} title="Offline selling" text="Cache catalog and queue transactions when internet is unavailable." value={offline} setValue={setOffline} /><div className="sync-diagnostic"><Cloud size={22} /><div><strong>{connection === 'online' ? 'Cloud connection healthy' : 'Operating offline'}</strong><p>{pendingCount} pending records · {conflicts.length} conflicts · Branch ID BR-001</p></div><button className="secondary-btn" onClick={synchronize}><RefreshCw size={16} /> Sync now</button></div>{conflicts.length > 0 && <div className="conflict-inbox"><h3>Conflict inbox</h3>{conflicts.map((conflict) => <div key={conflict.eventId}><AlertTriangle size={18} /><span><strong>{conflict.entityType} changed in two places</strong><small>Cloud version {conflict.serverVersion}; branch started from {conflict.clientVersion}.</small></span><button className="secondary-btn" onClick={async () => { await removeConflict(conflict.eventId); setConflicts((items) => items.filter((item) => item.eventId !== conflict.eventId)); notify('Cloud version accepted and conflict closed.') }}>Accept cloud</button></div>)}</div>}</>
  return <><PanelHead title="Notifications" subtitle="Choose which operational alerts your team receives." /><SettingToggle icon={Bell} title="Low stock alerts" text="Notify managers when stock reaches the reorder point." value={true} setValue={() => notify('Low stock alerts remain enabled.')} /><SettingToggle icon={ReceiptText} title="Daily sales summary" text="Send a closing summary to administrators." value={true} setValue={() => notify('Daily summary remains enabled.')} /></>
}

function SettingToggle({ icon: Icon, title, text, value, setValue }) {
  return <div className="toggle-row"><span className="setting-icon"><Icon size={20} /></span><div><strong>{title}</strong><p>{text}</p></div><button className={`toggle ${value ? 'on' : ''}`} onClick={() => setValue(!value)}><i /></button></div>
}

function Status({ value }) {
  const text = String(value)
  const lower = text.toLowerCase()
  const tone = ['active','completed','settled','connected','healthy','approved','success','open','live','allowed','posted','reconciled','printed','on shift'].some((item) => lower.includes(item)) ? 'success'
    : ['low','attention','partial','processing','review','transit','pending','ready','queued','reorder'].some((item) => lower.includes(item)) ? 'warning'
      : ['refund','inactive','failed','cancel','blocked'].some((item) => lower.includes(item)) ? 'danger' : 'neutral'
  return <span className={`status ${tone}`}><i />{text}</span>
}

function TableFooter({ count, page = 1, pageCount = 1, setPage = () => {} }) {
  return <div className="table-footer"><span>Showing {count} records</span><div><button disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))}><ChevronRight className="flip" size={16} /></button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((item) => <button className={page === item ? 'active' : ''} key={item} onClick={() => setPage(item)}>{item}</button>)}<button disabled={page === pageCount} onClick={() => setPage(Math.min(pageCount, page + 1))}><ChevronRight size={16} /></button></div></div>
}

function EmptyState({ icon: Icon, title, text }) {
  return <div className="empty-state"><span><Icon size={26} /></span><h3>{title}</h3><p>{text}</p></div>
}

function pretty(value) {
  return value.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase())
}

function formatValue(value) {
  if (typeof value === 'number' && value >= 1000) return value.toLocaleString()
  if (typeof value === 'number' && value > 0 && value < 500 && String(value).includes('.')) return money(value)
  return value
}

export default App
