
import { useState } from 'react'
import { createRequest } from '../lib/api'
import { checkScamAI } from '../lib/scamCheck'

const CATEGORIES = ['Groceries', 'Rides', 'Tools', 'Lost and Found', 'Other']

function findBestArea(data) {
  const informative = data.localityInfo?.informative || []
  const administrative = data.localityInfo?.administrative || []

  const detailedArea = informative.find((item) =>
    /neighbou?rhood|suburb|quarter|residential area|village/i.test(
      `${item.description || ''} ${item.name || ''}`
    )
  )

  if (detailedArea?.name) return detailedArea.name

  const districtArea = administrative.find((item) =>
    /district|town|city district|county/i.test(
      `${item.description || ''} ${item.name || ''}`
    )
  )

  if (districtArea?.name && districtArea.name !== data.city) {
    return districtArea.name
  }

  return (
    data.locality ||
    data.city ||
    data.principalSubdivision ||
    data.countryName ||
    ''
  )
}

export default function PostScreen({ onDone }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Groceries')
  const [urgent, setUrgent] = useState(false)

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
      setLocationError(
        'GPS is not supported by this browser. Please enter your area manually.'
      )
      return
    }

    setLocationLoading(true)

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        })
      })

      const lat = position.coords.latitude
      const lng = position.coords.longitude

      setLatitude(Number(lat.toFixed(2)))
      setLongitude(Number(lng.toFixed(2)))

      const response = await fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
      )

      if (!response.ok) {
        throw new Error('Could not find your area. Please enter it manually.')
      }

      const data = await response.json()
      const area = findBestArea(data)

      if (!area) {
        throw new Error('Area name unavailable. Please enter it manually.')
      }

      setLocation(area)
      setLocationError('')
    } catch (err) {
      setLocationError(
        err.code === 1
          ? 'Location permission was denied. You can enter your area manually.'
          : err.message ||
            'Could not detect your location. Please enter your area manually.'
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
      urgent,
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
      if (decision === 'WARN' || decision === 'OFFLINE') {
        await publishRequest(true)
        return
      }

      if (decision === 'BLOCK') {
        setError('This request cannot be posted. Please edit it.')
        return
      }

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
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '12px',
      padding: '12px',
      border: '1px solid var(--border, #ddd)',
      borderRadius: '12px',
    }}
  >
    <div>
      <strong>🚨 Mark as urgent</strong>
      <p className="muted small">
        Highlight this request for neighbours.
      </p>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={urgent}
      onClick={() => setUrgent(!urgent)}
      style={{
        width: '48px',
        height: '27px',
        borderRadius: '20px',
        border: 'none',
        padding: '3px',
        background: urgent ? '#16a34a' : '#9ca3af',
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          display: 'block',
          width: '21px',
          height: '21px',
          borderRadius: '50%',
          background: 'white',
          transform: urgent ? 'translateX(21px)' : 'translateX(0)',
          transition: 'transform 0.2s',
        }}
      />
    </button>
  </div>
  <p className="muted small">
    Only use this when help is needed quickly.
  </p>
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
            placeholder="Enter your neighbourhood, town or area"
          />

          <button
            type="button"
            className="btn"
            onClick={detectLocation}
            disabled={locationLoading}
          >
            {locationLoading
              ? 'Detecting location...'
              : '📍 Use my current location'}
          </button>

          {locationError && (
            <p className="error">{locationError}</p>
          )}

          <p className="muted small">
            HelpNest shows your approximate area to neighbours, not your exact
            GPS coordinates.
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
              Your request has not been published yet. If you continue,
              neighbours will see a safety warning.
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
