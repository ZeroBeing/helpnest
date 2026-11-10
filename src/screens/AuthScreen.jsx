import { useState } from 'react'
import { signUp, logIn, phoneToEmail } from '../lib/api'

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const email = phoneToEmail(phone)
      if (isSignup) {
        await signUp(email, password, name)
      } else {
        await logIn(email, password)
      }
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark">🏡</span> HelpNest
        </div>
        <h1>{isSignup ? 'Join your community' : 'Welcome back'}</h1>
        <p className="muted">Neighbours helping neighbours, safely.</p>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="field">
              <label>Your name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="field">
            <label>Phone number</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 1234567" required />
          </div>
          <div className="field">
            <label>Password (6+ characters)</label>
            <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p className="switch">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button className="link" onClick={() => { setIsSignup(!isSignup); setError('') }}>
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}