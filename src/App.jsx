
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getSession, logOut } from './lib/api'
import AuthScreen from './screens/AuthScreen'
import HomeScreen from './screens/HomeScreen'
import PostScreen from './screens/PostScreen'
import DetailScreen from './screens/DetailScreen'
import ProfileScreen from './screens/ProfileScreen'
import SOS from './components/SOS'

export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)
  const [view, setView] = useState('home')
  const [detailId, setDetailId] = useState(null)
  const [backTo, setBackTo] = useState('home')
  const [showSOS, setShowSOS] = useState(false)

  useEffect(() => {
    getSession().then((s) => {
      setSession(s)
      setChecking(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, s) =>
      setSession(s)
    )

    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    function openSOS() {
      setShowSOS(true)
    }

    window.addEventListener('open-helpnest-sos', openSOS)

    return () => {
      window.removeEventListener('open-helpnest-sos', openSOS)
    }
  }, [])

  function openRequest(id) {
    setBackTo(view === 'profile' ? 'profile' : 'home')
    setDetailId(id)
    setView('detail')
  }

  if (checking) return <p style={{ padding: 20 }}>Loading...</p>
  if (!session) return <AuthScreen />

  return (
    <div className="page">
      <div className="topbar">
        <strong>🏡 HelpNest</strong>

        <div className="nav">
          <button
            className={view === 'home' ? 'active' : ''}
            onClick={() => setView('home')}
          >
            Home
          </button>

          <button
            className={view === 'post' ? 'active' : ''}
            onClick={() => setView('post')}
          >
            Post a request
          </button>

          <button
            className={view === 'profile' ? 'active' : ''}
            onClick={() => setView('profile')}
          >
            Profile
          </button>
<button
  onClick={() => setShowSOS(true)}
  className="sos-nav-button"
>
  🚨 SOS
</button>
          <button onClick={logOut}>Log out</button>
        </div>
      </div>

      {view === 'home' && <HomeScreen onOpen={openRequest} />}

      {view === 'post' && (
        <PostScreen onDone={() => setView('home')} />
      )}

      {view === 'profile' && (
        <ProfileScreen myId={session.user.id} onOpen={openRequest} />
      )}

      {view === 'detail' && (
        <DetailScreen
          requestId={detailId}
          myId={session.user.id}
          onBack={() => setView(backTo)}
        />
      )}

      <button
        className="sos-floating"
        onClick={() => setShowSOS(true)}
        aria-label="Open emergency SOS"
      >
        SOS
      </button>

      {showSOS && <SOS onClose={() => setShowSOS(false)} />}
    </div>
  )
}
