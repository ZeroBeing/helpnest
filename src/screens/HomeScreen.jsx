
import { useEffect, useState } from 'react'
import { listOpenRequests } from '../lib/api'

const CATEGORIES = ['All', 'Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

const ICONS = {
  Groceries: '🛒',
  Rides: '🚗',
  Tools: '🔧',
  'Lost and Found': '🔎',
  Other: '💚',
}

export default function HomeScreen({ onOpen }) {
  const [filter, setFilter] = useState('All')
  const [urgentOnly, setUrgentOnly] = useState(false)
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    setLoading(true)

    listOpenRequests(
      filter === 'All' ? null : filter,
      urgentOnly
    )
      .then((data) => {
        if (active) {
          setRequests(data)
          setError('')
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [filter, urgentOnly])

  return (
    <div>
      <div className="home-sos-banner">
        <div className="home-sos-icon">🚨</div>

        <div className="home-sos-text">
          <h3>Need emergency help?</h3>
          <p>
            Access emergency contacts, safety steps and nearby resources.
          </p>
        </div>

        <button
          className="home-sos-button"
          onClick={() => window.dispatchEvent(new Event('open-helpnest-sos'))}
        >
          Get Help →
        </button>
      </div>

      <h2>Open requests</h2>

      <div className="chips">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            className={'chip' + (filter === c ? ' active' : '')}
            onClick={() => setFilter(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="chips">
        <button
          className={'chip' + (urgentOnly ? ' active' : '')}
          onClick={() => setUrgentOnly(!urgentOnly)}
        >
          🚨 {urgentOnly ? 'Showing urgent only' : 'Urgent Only'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}

      {!loading && !error && requests.length === 0 && (
        <p className="muted">
          {urgentOnly
            ? 'No urgent requests available right now.'
            : 'No requests in this category yet.'}
        </p>
      )}

      {requests.map((r) => {
        const requestLocation = r.location || r.area

        return (
          <div className="card" key={r.id}>
            <div>
              <span className="category">
                {ICONS[r.category] || '💚'} {r.category}
              </span>

              {r.urgent && (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      background: '#fee2e2',
      color: '#b91c1c',
      border: '1px solid #fecaca',
      borderRadius: '20px',
      padding: '5px 11px',
      fontSize: '11px',
      fontWeight: '800',
      letterSpacing: '0.5px',
      marginTop: '8px',
    }}
  >
    🚨 URGENT
  </span>
)}
            </div>

            <h3>{r.title}</h3>
            <p className="muted">{r.description}</p>

            {requestLocation && (
              <p className="small muted">
                📍 {requestLocation}
              </p>
            )}

            {r.scam_flag && (
              <p className="error">
                ⚠️ BEWARE — VERIFY BEFORE ACCEPTING.
                <br />
                This request was flagged by HelpNest's safety checker.
                Check the details carefully before offering help.
              </p>
            )}

            <p className="small muted">
              Posted by {r.users?.name || 'a neighbour'}
            </p>

            <button
              className="btn secondary small"
              onClick={() => onOpen(r.id)}
            >
              View request →
            </button>
          </div>
        )
      })}
    </div>
  )
}
