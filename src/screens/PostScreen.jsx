
import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScam, checkScamAI } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [warning, setWarning] = useState(false)
  const [warningReason, setWarningReason] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkedScamFlag, setCheckedScamFlag] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!warning) {
      setLoading(true)

      try {
        const aiResult = await checkScamAI(title, description)
        const manualResult = checkScam(title, description)

        const scamFlag = aiResult.scamFlag || manualResult.scamFlag

        setCheckedScamFlag(scamFlag)

        if (scamFlag) {
          setWarningReason(
            aiResult.scamFlag
              ? aiResult.reason || 'Gemini AI detected potentially unsafe content.'
              : 'The backup safety checker detected suspicious content.'
          )
          setWarning(true)
          setLoading(false)
          return
        }

        await createRequest({
          title,
          description,
          category,
          scamFlag: false,
        })

        onDone()
      } catch (err) {
        setError(err.message || 'Something went wrong.')
        setLoading(false)
      }

      return
    }

    setLoading(true)

    try {
      await createRequest({
        title,
        description,
        category,
        scamFlag: checkedScamFlag,
      })

      onDone()
    } catch (err) {
      setError(err.message || 'Something went wrong.')
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
              setWarning(false)
              setCheckedScamFlag(false)
            }}
            required
          />
        </div>

        <div className="field">
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
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
              setWarning(false)
              setCheckedScamFlag(false)
            }}
            required
          />
        </div>

        {warning && (
          <p className="error">
            ⚠️ {warningReason}
            <br />
            HelpNest is for free neighbour help only. You can edit your
            request or post anyway. Requests flagged as suspicious will
            be held for review.
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>
          {loading
            ? 'Checking safety...'
            : warning
              ? 'Post anyway (held for review)'
              : 'Check with AI and post'}
        </button>
      </form>
    </div>
  )
}
