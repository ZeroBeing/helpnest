
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getSession, logOut } from './lib/api'
import { listMyOffers } from './lib/extra'
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

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('helpnest-seen') || '[]')
    } catch {
      return []
    }
  })

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
    if (!session?.user?.id) return

    let active = true

    async function checkNotifications() {
      try {
        const userId = session.user.id

        const [owned, offers, incomingOffers] = await Promise.all([
          supabase
            .from('requests')
            .select('id, title, status')
            .eq('user_id', userId)
            .eq('status', 'matched')
            .is('deleted_at', null),

          listMyOffers(),

          supabase
            .from('responses')
            .select(`
              id,
              request_id,
              accepted,
              users(name),
              requests!inner(
                id,
                title,
                user_id,
                deleted_at
              )
            `)
            .eq('requests.user_id', userId)
            .is('requests.deleted_at', null),
        ])

        if (owned.error) throw owned.error
        if (incomingOffers.error) throw incomingOffers.error
        if (!active) return

        const items = []

        // Notify owners when their requests are matched.
        owned.data.forEach((r) => {
          items.push({
            id: `owner-${r.id}`,
            requestId: r.id,
            title: 'Your request has a helper!',
            message: `"${r.title}" has been matched.`,
          })
        })

        // Notify owners when someone offers help.
        incomingOffers.data.forEach((o) => {
          const request = o.requests
          const helperName = o.users?.name

          items.push({
            id: `offer-${o.id}`,
            requestId: o.request_id,
            title: 'Someone offered to help!',
            message: `${helperName || 'A neighbour'} offered to help with "${request.title}".`,
          })
        })

        // Keep existing helper notifications.
        offers.forEach((o) => {
          if (!o.requests) return

          if (o.accepted) {
            items.push({
              id: `helper-${o.id}`,
              requestId: o.request_id,
              title: 'Your offer was accepted!',
              message: `The owner accepted your offer for "${o.requests.title || 'a request'}".`,
            })
          } else if (o.requests.status === 'matched') {
            items.push({
              id: `other-${o.id}`,
              requestId: o.request_id,
              title: 'Request already matched',
              message: `"${o.requests.title || 'This request'}" has another helper.`,
            })
          }
        })

        if (active) setNotifications(items)
      } catch (error) {
        console.error('Notification check failed:', error.message)
      }
    }

    checkNotifications()
    const timer = setInterval(checkNotifications, 10000)

    return () => {
      active = false
      clearInterval(timer)
    }
  }, [session?.user?.id])

  useEffect(() => {
    try {
      localStorage.setItem('helpnest-seen', JSON.stringify(seen))
    } catch {
      // Notifications still work for this session.
    }
  }, [seen])

  useEffect(() => {
    function openSOS() {
      setShowSOS(true)
    }

    window.addEventListener('open-helpnest-sos', openSOS)
    return () => window.removeEventListener('open-helpnest-sos', openSOS)
  }, [])

  function openRequest(id) {
    setBackTo(view === 'profile' ? 'profile' : 'home')
    setDetailId(id)
    setView('detail')
    setShowNotifications(false)
  }

  function openNotification(item) {
    setSeen((prev) => [...new Set([...prev, item.id])])
    openRequest(item.requestId)
  }

  const unread = notifications.filter((n) => !seen.includes(n.id)).length

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

          <button onClick={() => setShowNotifications(!showNotifications)}>
            🔔 Notifications {unread > 0 ? `(${unread})` : ''}
          </button>

          <button onClick={() => setShowSOS(true)} className="sos-nav-button">
            🚨 SOS
          </button>

          <button className="logout-button" onClick={logOut}>
            ↪ Log out
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="card" style={{ margin: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3>🔔 Notifications</h3>
            <button
              className="link"
              onClick={() => setShowNotifications(false)}
            >
              Close
            </button>
          </div>

          {notifications.length === 0 && (
            <p className="muted">No notifications yet.</p>
          )}

          {notifications.map((item) => (
            <button
              key={item.id}
              onClick={() => openNotification(item)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: 12,
                marginBottom: 8,
                border: '1px solid var(--line)',
                borderRadius: 10,
                background: seen.includes(item.id) ? 'white' : 'var(--mint)',
                cursor: 'pointer',
              }}
            >
              <strong>{item.title}</strong>
              <p className="small">{item.message}</p>
              {!seen.includes(item.id) && (
                <span className="small">● New</span>
              )}
            </button>
          ))}
        </div>
      )}

      {view === 'home' && <HomeScreen onOpen={openRequest} />}

      {view === 'post' && <PostScreen onDone={() => setView('home')} />}

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
