import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getSession, logOut, listOpenRequests } from './lib/api'
import AuthScreen from './screens/AuthScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')

  // Remember who is logged in, and update when they log in or out.
  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  // Load requests once someone is logged in.
  useEffect(() => {
    if (!session) return
    listOpenRequests()
      .then(setRequests)
      .catch((e) => setError(e.message))
  }, [session])

  if (checking) return <p style={{ padding: 20 }}>Loading...</p>
  if (!session) return <AuthScreen />

  return (
    <div className="page">
      <div className="topbar">
        <strong>🏡 HelpNest</strong>
        <button className="btn small" onClick={logOut}>Log out</button>
      </div>
      <p className="muted">Logged in as {session.user.email}</p>
      <h2>Open requests</h2>
      {error && <p className="error">{error}</p>}
      {requests.length === 0 && <p>No open requests yet.</p>}
      {requests.map((r) => (
        <div className="card" key={r.id}>
          <strong>{r.title}</strong>
          <p className="muted">{r.description}</p>
        </div>
      ))}
    </div>
  )
}