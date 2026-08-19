import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  // Form States
  const [isSignUp, setIsSignUp] = useState(false);
  const [role, setRole] = useState('owner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyCode, setCompanyCode] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuth(e) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const generatedCode = role === 'owner' 
          ? 'AQUA-' + Math.floor(1000 + Math.random() * 9000)
          : companyCode;

        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').insert([
            {
              id: data.user.id,
              full_name: fullName,
              role,
              company_code: generatedCode
            }
          ]);
        }
        alert('Account Created Successfully!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (session && profile) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '24px', fontFamily: 'sans-serif' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', backgroundColor: '#fff', padding: '16px', borderRadius: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', margin: 0 }}>AquaFlow Delivery</h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Logged in as: <strong style={{ textTransform: 'capitalize' }}>{profile.role}</strong> ({profile.full_name || session.user.email})</p>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()} 
            style={{ padding: '8px 16px', backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </header>

        <main style={{ marginTop: '24px' }}>
          {profile.role === 'owner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ padding: '24px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>Your Company Code</h2>
                <p style={{ fontSize: '32px', fontWeight: '900', color: '#2563eb', letterSpacing: '2px', margin: '8px 0 0 0' }}>{profile.company_code}</p>
                <p style={{ fontSize: '12px', color: '#1d4ed8', margin: '4px 0 0 0' }}>Share this code with your Agents and Customers to link them to your business.</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Today's Orders</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0 0 0' }}>0</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Completed</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#16a34a', margin: '4px 0 0 0' }}>0</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Active Agents</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', margin: '4px 0 0 0' }}>0</p>
                </div>
                <div style={{ padding: '16px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Total Revenue</p>
                  <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '4px 0 0 0' }}>₹0</p>
                </div>
              </div>
            </div>
          )}

          {profile.role === 'agent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Agent Delivery Dashboard</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Connected Company Code: <strong>{profile.company_code}</strong></p>
              </div>
              <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#fff', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                No deliveries assigned for today.
              </div>
            </div>
          )}

          {profile.role === 'customer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Customer Dashboard</h2>
                <p style={{ fontSize: '14px', color: '#64748b', margin: '4px 0 0 0' }}>Linked Supplier Code: <strong>{profile.company_code}</strong></p>
              </div>
              <div style={{ padding: '24px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                <h3 style={{ fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Order Water Can</h3>
                <button style={{ padding: '12px 24px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  Request 20L Bottle Delivery
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 'bold', textAlign: 'center', color: '#2563eb', margin: '0 0 8px 0' }}>AquaFlow Delivery</h2>
        <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', margin: '0 0 24px 0' }}>{isSignUp ? 'Create a new account' : 'Sign in to your account'}</p>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Select Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['owner', 'agent', 'customer'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  style={{
                    padding: '8px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                    backgroundColor: role === r ? '#2563eb' : '#f8fafc',
                    color: role === r ? '#fff' : '#475569'
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {isSignUp && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="John Doe"
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
              placeholder="••••••••"
            />
          </div>

          {isSignUp && role !== 'owner' && (
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>Company Code</label>
              <input
                type="text"
                required
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }}
                placeholder="Enter Owner's AQUA-XXXX Code"
              />
            </div>
          )}

          <button
            type="submit"
            style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#fff', fontWeight: 'bold', borderRadius: '8px', border: 'none', cursor: 'pointer', marginTop: '8px' }}
          >
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
