
import { useEffect, useState } from 'react'
import {
  getProfileStats,
  listMyRequests,
  deleteRequest
} from '../lib/api'
import { listMyOffers } from '../lib/extra'
import { supabase } from '../lib/supabaseClient'

const STATUS_LABEL = {
  open: 'Open',
  matched: 'In progress',
  done: 'Done'
}

function offerLabel(o) {
  const status = o.requests?.status
  if (status === 'done') return 'Done'
  if (o.accepted) return 'Accepted ✓ Open the chat'
  if (status === 'matched') return 'Owner chose someone else'
  return 'Waiting for the owner'
}

function getTrustStatus(rating, count) {
  if (!count) return 'New member'
  if (rating >= 4.5) return 'Trusted helper'
  if (rating >= 3.5) return 'Good helper'
  return 'Building reputation'
}

export default function ProfileScreen({ myId, onOpen }) {
  const [stats, setStats] = useState(null)
  const [mine, setMine] = useState([])
  const [offers, setOffers] = useState([])
  const [username, setUsername] = useState('Your account')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      try {
        const [s, m, o, profileResult] = await Promise.all([
          getProfileStats(myId),
          listMyRequests(),
          listMyOffers(),
          supabase
            .from('users')
            .select('name')
            .eq('id', myId)
            .maybeSingle()
        ])

        if (!active) return

        setStats(s)
        setMine(m)
        setOffers(o)
        setUsername(profileResult.data?.name || 'Your account')
      } catch (e) {
        if (active) setError(e.message)
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  }, [myId])

  async function handleDelete(id, title) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"?`
    )

    if (!confirmed) return

    try {
      setDeletingId(id)
      setError('')

      await deleteRequest(id)

      setMine(previous => previous.filter(r => r.id !== id))

      setStats(previous => ({
        ...previous,
        requestsPosted: Math.max(
          0,
          (previous.requestsPosted || 0) - 1
        )
      }))
    } catch (e) {
      setError(e.message)
    } finally {
      setDeletingId(null)
    }
  }

  if (error && !stats) {
    return <p className="error">{error}</p>
  }

  if (!stats) {
    return <p className="muted">Loading...</p>
  }

  const trust = getTrustStatus(stats.rating, stats.peopleHelped)

  return (
    <div>
      {error && <p className="error">{error}</p>}

      <div className="card">
        <h2>My Profile</h2>
        <h3>👤 {username}</h3>
        <p>⭐ {Number(stats.rating || 0).toFixed(1)} rating</p>
        <p>{stats.peopleHelped || 0} people helped</p>
        <p>{trust}</p>
        <p>{stats.requestsPosted || 0} requests posted</p>
      </div>

      <h3>Requests I offered help on</h3>

      {offers.map(o => (
        <div className="card" key={o.id}>
          <h3>{o.requests?.title || 'Request'}</h3>
          <p>{offerLabel(o)}</p>

          {o.request_id && (
            <button
              className="btn secondary small"
              onClick={() => onOpen(o.request_id)}
            >
              View request →
            </button>
          )}
        </div>
      ))}

      <h3>My requests</h3>

      {mine.length === 0 && (
        <p className="muted">You haven't posted any requests yet.</p>
      )}

      {mine.map(r => (
        <div className="card" key={r.id}>
          <span className={'badge ' + r.status}>
            {STATUS_LABEL[r.status] || r.status}
          </span>

          <h3>{r.title}</h3>

          <div className="request-actions">
            <button
              className="btn secondary small"
              onClick={() => onOpen(r.id)}
            >
              View request →
            </button>

            <button
              className="btn delete-button small"
              disabled={deletingId === r.id}
              onClick={() => handleDelete(r.id, r.title)}
            >
              {deletingId === r.id ? 'Deleting...' : '🗑 Delete'}
            </button>
          </div>
        </div>
      ))}

      <style>{`
        .request-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          margin-top: 12px;
        }

        .delete-button {
          background: #dc2626 !important;
          color: white !important;
          border: 1px solid #dc2626 !important;
          font-weight: 700;
        }

        .delete-button:hover {
          background: #b91c1c !important;
        }
      `}</style>
    </div>
  )
}
