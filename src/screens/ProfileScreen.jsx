
import { useEffect, useState } from 'react'
import { getProfileStats, listMyRequests } from '../lib/api'
import { listMyOffers } from '../lib/extra'

const STATUS_LABEL = { open: 'Open', matched: 'In progress', done: 'Done' }

function offerLabel(o) {
  const status = o.requests?.status
  if (status === 'done') return 'Done'
  if (o.accepted) return 'Accepted ✓ Open the chat'
  if (status === 'matched') return 'Owner chose someone else'
  return 'Waiting for the owner'
}

function getTrustStatus(rating, count) {
  if (count < 3) {
    return { label: count === 0 ? 'New user' : 'Building reputation', warning: false }
  }

  if (rating < 1.5) {
    return { label: '🚨 Very low rating — Proceed with caution', warning: true }
  }

  if (rating < 2.5) {
    return { label: '⚠️ Weak rating — Be careful', warning: true }
  }

  return { label: '⭐ Normal reputation', warning: false }
}

export default function ProfileScreen({ myId, onOpen }) {
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState([])
  const [offers, setOffers] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getProfileStats(myId), listMyRequests(), listMyOffers()])
      .then(([s, m, o]) => {
        setStats(s)
        setMine(m)
        setOffers(o)
      })
      .catch((e) => setError(e.message))
  }, [myId])

  if (error) return <p className="error">{error}</p>
  if (!stats) return <p className="muted">Loading...</p>

  const trust = getTrustStatus(stats.rating, stats.peopleHelped)

  return (
    <div>
      <div className="card">
        <h2>{stats.name}</h2>

        <p>
          ⭐ {stats.rating > 0 ? stats.rating.toFixed(1) : 'New'}
        </p>

        <p className={trust.warning ? 'error' : 'info'}>
          {trust.label}
        </p>

        <p className="small muted">
          {stats.peopleHelped} ratings received · {stats.requestsPosted} requests posted
        </p>

        {stats.peopleHelped < 3 && (
          <p className="small muted">
            Trust status becomes active after 3 ratings.
          </p>
        )}
      </div>

      <h3>Requests I offered help on</h3>
      {offers.length === 0 && <p className="muted">No offers yet.</p>}
      {offers.map((o) => (
        <div className="card" key={o.id}>
          <span className={'badge ' + (o.requests?.status || 'open')}>
            {offerLabel(o)}
          </span>
          <h3>{o.requests?.title}</h3>
          <button className="btn secondary small" onClick={() => onOpen(o.request_id)}>
            View request →
          </button>
        </div>
      ))}

      <h3>My requests</h3>
      {mine.length === 0 && <p className="muted">You haven't posted anything yet.</p>}
      {mine.map((r) => (
        <div className="card" key={r.id}>
          <span className={'badge ' + r.status}>{STATUS_LABEL[r.status]}</span>
          <h3>{r.title}</h3>
          <button className="btn secondary small" onClick={() => onOpen(r.id)}>
            View request →
          </button>
        </div>
      ))}
    </div>
  )
}
