
import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScam, checkScamAI } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [decision, setDecision] = useState('')
  const [warningReason, setWarningReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetCheck() {
    setDecision('')
    setWarningReason('')
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (loading) return

    setLoading(true)

    try {
      // If the request has not been checked yet, run AI safety checks.
      if (!decision) {
        const aiResult = await checkScamAI(title, description)
        const manualResult = checkScam(title, description)

        let resultDecision = aiResult.decision

        // Backup checker: suspicious phrases receive a warning.
        if (manualResult.scamFlag && resultDecision !== 'BLOCK') {
          resultDecision = 'WARN'
        }

        // If AI is unavailable, use the manual checker.
        if (!resultDecision) {
          resultDecision = manualResult.scamFlag ? 'WARN' : 'ALLOW'
        }

        setDecision(resultDecision)
        setWarningReason(aiResult.reason || 'Please verify this request carefully.')

        if (resultDecision === 'BLOCK') {
          setError(
            aiResult.reason ||
            'Requests asking neighbours for money or payments are not allowed on HelpNest.'
          )
          return
        }

        if (resultDecision === 'WARN') {
          return
        }
      } else if (decision === 'BLOCK') {
        setError('This request cannot be posted because it violates HelpNest free-help rules.')
        return
      } else if (decision === 'WARN') {
        // User has acknowledged the warning by submitting again.
        await createRequest({
          title,
          description,
          category,
          scamFlag: true,
        })

        onDone()
        return
      }

      // Normal request.
      await createRequest({
        title,
        description,
        category,
        scamFlag: false,
      })

      onDone()
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

        {decision === 'WARN' && (
          <p className="error">
            ⚠️ Beware — Verify Before Accepting.
            <br />
            {warningReason}
            <br />
            You may post this request, but neighbours will see this warning.
            Only continue if your request is genuine.
          </p>
        )}

        {decision === 'BLOCK' && (
          <p className="error">
            🚫 This request is not allowed.
            <br />
            HelpNest is exclusively for free neighbour help.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading
            ? 'Checking safety...'
            : decision === 'WARN'
              ? 'I Understand — Post Request'
              : decision === 'BLOCK'
                ? 'Edit Request'
                : 'Check with AI and post'}
        </button>
      </form>
    </div>
  )
}
