
import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScamAI } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState(null)
  const [longitude, setLongitude] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState('')

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

  async function detectLocation() {
    setLocationError('')

    if (!navigator.geolocation) {
      setLocationError('GPS is not supported by this browser. Please enter your area manually.')
      return
    }

    setLocationLoading(true)

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude

      // Keep only approximate coordinates for privacy.
      setLatitude(Number(lat.toFixed(2)))
      setLongitude(Number(lng.toFixed(2)))

      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      )

      if (!response.ok) {
        throw new Error('Could not find your area name. Please enter it manually.')
      }

      const data = await response.json()

      const area =
        data.locality ||
        data.city ||
        data.principalSubdivision ||
        data.countryName

      if (!area) {
        throw new Error('Area name unavailable. Please enter it manually.')
      }

      setLocation(area)
      setLocationError('')
    } catch (err) {
      setLocationError(
        err.code === 1
          ? 'Location permission was denied. You can enter your area manually.'
          : err.message || 'Could not detect your location. Please enter it manually.'
      )
      setLatitude(null)
      setLongitude(null)
    } finally {
      setLocationLoading(false)
    }
  }

  async function publishRequest(flagged) {
    await createRequest({
      title,
      description,
      category,
      scamFlag: flagged,
      location: location.trim() || null,
      latitude,
      longitude,
    })

    onDone()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (loading) return

    setLoading(true)

    try {
      // User confirms a warning or offline notice.
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

        <div className="field">
          <label>📍 Approximate area (optional)</label>

          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value)
              setLatitude(null)
              setLongitude(null)
            }}
            placeholder="Enter your area or neighbourhood"
          />

          <button
            type="button"
            className="btn"
            onClick={detectLocation}
            disabled={locationLoading}
          >
            {locationLoading ? 'Detecting location...' : '📍 Use my current location'}
          </button>

          {locationError && (
            <p className="error">{locationError}</p>
          )}

          <p className="muted small">
            Only your approximate area is shown to neighbours. Exact GPS coordinates are not saved.
          </p>
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
