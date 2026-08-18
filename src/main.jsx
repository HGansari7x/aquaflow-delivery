import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { supabase } from './supabase'
import './styles.css'

const roles = ['OWNER', 'AGENT', 'CUSTOMER']

function App() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState('OWNER')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [orders, setOrders] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session?.user) return
    loadProfile()
  }, [session])

  async function loadProfile() {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (error) return setMessage(error.message)
    setProfile(data)
    loadOrders(data)
  }

  async function loadOrders(p = profile) {
    if (!p) return
    const { data, error } = await supabase
      .from('orders')
      .select('id, quantity, status, product, created_at, customer_id, agent_id, delivery_address')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) return setMessage(error.message)
    setOrders(data || [])
  }

  useEffect(() => {
    if (!profile) return
    loadOrders()
    const channel = supabase
      .channel('aquaflow-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadOrders)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [profile])

  async function login(e) {
    e.preventDefault()
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    setMessage(error ? error.message : 'Logged in.')
  }

  async function signup() {
    setLoading(true); setMessage('')
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { role } } })
    setLoading(false)
    setMessage(error ? error.message : 'Account created. Check email confirmation if enabled.')
  }

  async function logout() {
    await supabase.auth.signOut()
    setProfile(null); setOrders([])
  }

  if (!session) return (
    <main className="shell">
      <section className="card auth">
        <div className="brand">💧 AquaFlow Delivery</div>
        <p className="muted">Phase 1 — secure multi-tenant core</p>
        <div className="roles">
          {roles.map(r => <button className={role === r ? 'role active' : 'role'} onClick={() => setRole(r)} key={r}>{r}</button>)}
        </div>
        <form onSubmit={login}>
          <input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength="6" />
          <button className="primary" disabled={loading}>{loading ? 'Please wait…' : 'Login'}</button>
        </form>
        <button className="secondary" onClick={signup} disabled={loading}>Create account</button>
        {message && <p className="message">{message}</p>}
      </section>
    </main>
  )

  return (
    <main className="shell">
      <header className="topbar">
        <div><strong>💧 AquaFlow</strong><span className="badge">{profile?.role || role}</span></div>
        <button className="secondary" onClick={logout}>Logout</button>
      </header>

      <section className="grid">
        <div className="stat"><span>Orders</span><strong>{orders.length}</strong></div>
        <div className="stat"><span>Pending</span><strong>{orders.filter(o => o.status === 'PENDING').length}</strong></div>
        <div className="stat"><span>Delivered</span><strong>{orders.filter(o => o.status === 'DELIVERED').length}</strong></div>
      </section>

      {profile?.role === 'CUSTOMER' && <CustomerOrder onCreated={loadOrders} />}
      <section className="card">
        <div className="section-title"><h2>{profile?.role === 'AGENT' ? 'My Assigned Orders' : 'Orders'}</h2><button className="secondary" onClick={() => loadOrders()}>Refresh</button></div>
        {orders.length === 0 ? <p className="muted">No orders yet.</p> : orders.map(o => (
          <article className="order" key={o.id}>
            <div><strong>#{o.id.slice(0, 8)}</strong><span>{o.product} × {o.quantity}</span></div>
            <div><span className={'status ' + o.status.toLowerCase()}>{o.status}</span><small>{new Date(o.created_at).toLocaleString()}</small></div>
          </article>
        ))}
      </section>
    </main>
  )
}

function CustomerOrder({ onCreated }) {
  const [quantity, setQuantity] = useState(1)
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function place() {
    setBusy(true); setMsg('')
    const { data: p } = await supabase.from('profiles').select('customer_id, owner_id').eq('id', (await supabase.auth.getUser()).data.user.id).single()
    if (!p?.customer_id || !p?.owner_id) { setMsg('Customer profile is not linked to a business yet.'); setBusy(false); return }
    const { error } = await supabase.from('orders').insert({
      owner_id: p.owner_id, customer_id: p.customer_id, quantity,
      product: '20L Water Bottle', delivery_address: address, status: 'PENDING'
    })
    setBusy(false)
    setMsg(error ? error.message : 'Order placed.')
    if (!error) onCreated()
  }

  return <section className="card">
    <h2>Place Order</h2>
    <div className="qty"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><strong>{quantity}</strong><button onClick={() => setQuantity(quantity + 1)}>+</button></div>
    <input placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} />
    <button className="primary" onClick={place} disabled={busy}>{busy ? 'Placing…' : 'Place Order'}</button>
    {msg && <p className="message">{msg}</p>}
  </section>
}

createRoot(document.getElementById('root')).render(<App />)
