import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScam } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [warning, setWarning] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const { scamFlag } = checkScam(title, description)
    if (scamFlag && !warning) {
      setWarning(true)
      return
    }
    setLoading(true)
    try {
      await createRequest({ title, description, category, scamFlag })
      onDone()
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Ask your neighbours for help</h2>
      <p className="muted">Free help only. Never share money, bank details or passwords.</p>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>What do you need?</label>
          <input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setWarning(false) }}
            required
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Details</label>
          <textarea
            value={description}
            onChange={(e) => { setDescription(e.target.value); setWarning(false) }}
            required
          />
        </div>

        {warning && (
          <p className="error">
            ⚠️ This looks like it may involve money, personal info or links. HelpNest is for
            free neighbour help only. Please edit your request, or post anyway and it will
            be held for review.
          </p>
        )}
        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Posting...' : warning ? 'Post anyway (held for review)' : 'Post request'}
        </button>
      </form>
    </div>
  )
}