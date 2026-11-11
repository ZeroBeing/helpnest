
import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScamAI } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [decision, setDecision] = useState('')
  const [warningReason, setWarningReason] = useState('')
  const [safetyNotice, setSafetyNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetCheck() {
    setDecision('')
    setWarningReason('')
    setSafetyNotice('')
    setError('')
  }

  async function publishRequest(flagged) {
    await createRequest({
      title,
      description,
      category,
      scamFlag: flagged,
    })

    onDone()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (loading) return

    setLoading(true)

    try {
      // Second submission: user confirms a warning or offline notice.
      if (decision === 'WARN' || decision === 'OFFLINE') {
  await publishRequest(true)
  return
}

      if (decision === 'BLOCK') {
        setError('This request cannot be posted. Please edit it.')
        return
      }

      // First submission: run safety checks.
      const result = await checkScamAI(title, description)

      setDecision(result.decision)
      setWarningReason(
        result.reason || 'Please verify this request carefully.'
      )

      if (!result.aiChecked) {
        setDecision('OFFLINE')
        setSafetyNotice(
          'AI moderation is currently unavailable. Only limited offline safety checks were used. They cannot detect every harmful or suspicious request. Please review your request carefully.'
        )
        return
      }

      if (result.decision === 'BLOCK') {
        setError(
          result.reason || 'This request violates HelpNest safety rules.'
        )
        return
      }

      if (result.decision === 'WARN') {
        return
      }

      // AI and offline checks both passed.
      await publishRequest(false)
    } catch (err) {
      setError(err.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2>Ask your neighbours for help</h2>

      <p className="muted">
        Free help only. Never share money, bank details or passwords.
      </p>

      <form onSubmit={handleSubmit} className="card">
        <div className="field">
          <label>What do you need?</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              resetCheck()
            }}
            required
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              resetCheck()
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Details</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value)
              resetCheck()
            }}
            required
          />
        </div>

        {decision === 'OFFLINE' && (
          <div className="error">
            <strong>⚠️ AI SAFETY CHECK UNAVAILABLE</strong>
            <p>{safetyNotice}</p>
            <p>Your request has not been published yet.</p>
            <p>You can edit it or confirm to post.</p>
          </div>
        )}

        {decision === 'WARN' && (
          <div className="error">
            <strong>⚠️ BEWARE — VERIFY BEFORE ACCEPTING</strong>
            <p>{warningReason}</p>
            <p>
              Your request has not been published yet.
              If you continue, neighbours will see a safety warning.
            </p>
          </div>
        )}

        {decision === 'BLOCK' && (
          <p className="error">
            🚫 This request is not allowed. Please edit it.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading
            ? 'Checking safety...'
            : decision === 'WARN'
              ? 'I Understand — Post Flagged Request'
              : decision === 'OFFLINE'
                ? 'I Understand — Post Anyway'
                : decision === 'BLOCK'
                  ? 'Check Edited Request'
                  : 'Check safety and post'}
        </button>
      </form>
    </div>
  )
}
