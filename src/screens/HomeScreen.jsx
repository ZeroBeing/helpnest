import { useEffect, useState } from 'react'
import { listOpenRequests } from '../lib/api'

const CATEGORIES = ['All', 'Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']
const ICONS = { Groceries: '🛒', Rides: '🚗', Tools: '🔧', 'Lost and Found': '🔎', Other: '💚' }

export default function HomeScreen() {
  const [filter, setFilter] = useState('All')
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    listOpenRequests(filter === 'All' ? null : filter)
      .then((data) => {
        setRequests(data)
        setError('')
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <div>
      <h2>Open requests</h2>
      <div className="chips">
        {CATEGORIES.map((c) => (
          <button key={c} className={'chip' + (filter === c ? ' active' : '')} onClick={() => setFilter(c)}>
            {c}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="muted">Loading...</p>}
      {!loading && requests.length === 0 && <p className="muted">No requests in this category yet.</p>}

      {requests.map((r) => (
        <div className="card" key={r.id}>
          <span className="category">{ICONS[r.category] || '💚'} {r.category}</span>
          <h3>{r.title}</h3>
          <p className="muted">{r.description}</p>
          <p className="small muted">Posted by {r.users?.name || 'a neighbour'}</p>
        </div>
      ))}
    </div>
  )
}