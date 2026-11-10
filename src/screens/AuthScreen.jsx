import { useState } from 'react'
import { signUp, logIn } from '../lib/api'

export default function AuthScreen() {
  const [isSignup, setIsSignup] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (isSignup) {
        const result = await signUp(email, password, name)
        // If email confirmation is still on, there is no session yet.
        if (!result.session) {
          setInfo('Account created. Check your email to confirm, then log in.')
        }
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
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Password (6+ characters)</label>
            <input type="password" minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="error">{error}</p>}
          {info && <p className="info">{info}</p>}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Please wait...' : isSignup ? 'Sign up' : 'Log in'}
          </button>
        </form>

        <p className="switch">
          {isSignup ? 'Already have an account?' : 'New here?'}{' '}
          <button className="link" onClick={() => { setIsSignup(!isSignup); setError(''); setInfo('') }}>
            {isSignup ? 'Log in' : 'Create an account'}
          </button>
        </p>
      </div>
    </div>
  )
}