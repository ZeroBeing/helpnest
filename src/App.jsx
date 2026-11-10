import { useEffect, useState } from 'react'
import { listOpenRequests } from './lib/api'

export default function App() {
  const [requests, setRequests] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    listOpenRequests()
      .then(setRequests)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p>Error: {error}</p>
  return (
    <div>
      <h1>HelpNest</h1>
      {requests.length === 0 && <p>No open requests yet.</p>}
      {requests.map((r) => (
        <p key={r.id}>{r.title}</p>
      ))}
    </div>
  )
}