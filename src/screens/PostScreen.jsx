import { useState } from 'react'
import { createRequest } from '../lib/api'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // The AI scam check will go here later. For now every post is marked safe.
      await createRequest({ title, description, category, scamFlag: false })
      onDone()
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div>
      <h2>Ask your neighbours for help</h2>
      <p className="muted">Free help only. Never share money, gift cards, or passwords.</p>
      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>What do you need?</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Help carrying groceries" required />
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
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="When, where (area only), anything helpful" required />
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Posting...' : 'Post request'}
        </button>
      </form>
    </div>
  )
}