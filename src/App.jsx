import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getSession, logOut } from './lib/api'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import PostScreen from './screens/PostScreen'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('home')

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setChecking(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (checking) return <p style={{ padding: 20 }}>Loading...</p>
  if (!session) return <AuthScreen />

  return (
    <div className="page">
      <div className="topbar">
        <strong>🏡 HelpNest</strong>
        <div className="nav">
          <button className={view === 'home' ? 'active' : ''} onClick={() => setView('home')}>Home</button>
          <button className={view === 'post' ? 'active' : ''} onClick={() => setView('post')}>Post a request</button>
          <button onClick={logOut}>Log out</button>
        </div>
      </div>

      {view === 'home' && <HomeScreen />}
      {view === 'post' && <PostScreen onDone={() => setView('home')} />}
    </div>
  )
}