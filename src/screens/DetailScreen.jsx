import { useEffect, useState, useCallback, useRef } from 'react'
import {
  getRequest, getMyRole, listResponses, offerHelp, acceptHelper, getAcceptedHelper,
  loadMessages, sendMessage, subscribeToMessages, completeRequest, reportRequest,
} from '../lib/api'

const ICONS = { Groceries: '🛒', Rides: '🚗', Tools: '🔧', 'Lost and Found': '🔎', Other: '💚' }
const STATUS_LABEL = { open: 'Open', matched: 'In progress', done: 'Done' }

function Rating({ value }) {
  const n = Number(value)
  return n > 0 ? <span className="rate">★ {n.toFixed(1)}</span> : <span className="rate new">New</span>
}

function Chat({ requestId, myId }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const endRef = useRef(null)

  const add = useCallback((m) => {
    setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]))
  }, [])

  useEffect(() => {
    loadMessages(requestId)
      .then((list) =>
        setMessages((prev) => {
          const ids = new Set(list.map((m) => m.id))
          return [...list, ...prev.filter((m) => !ids.has(m.id))]
        })
      )
      .catch((e) => setErr(e.message))
    const stop = subscribeToMessages(requestId, add)
    return () => stop()
  }, [requestId, add])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!text.trim()) return
    setErr('')
    try {
      const m = await sendMessage(requestId, text.trim())
      add(m)
      setText('')
    } catch (e2) {
      setErr(e2.message)
    }
  }

  return (
    <div className="card">
      <h3>💬 Chat</h3>
      <p className="small muted">Keep chat here. Never share money, gift cards, OTPs or passwords.</p>
      <div className="chatbox">
        {messages.length === 0 && <p className="muted small">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={'bubble ' + (m.sender_id === myId ? 'mine' : 'theirs')}>
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {err && <p className="error">{err}</p>}
      <form onSubmit={handleSend} className="chat-form">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." />
        <button className="btn small" type="submit">Send</button>
      </form>
    </div>
  )
}

export default function DetailScreen({ requestId, myId, onBack }) {
  const [request, setRequest] = useState(null)
  const [role, setRole] = useState('none')
  const [offers, setOffers] = useState([])
  const [accepted, setAccepted] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [stars, setStars] = useState(0)
  const [review, setReview] = useState('')

  const load = useCallback(async () => {
    try {
      const [r, ro, offs, acc] = await Promise.all([
        getRequest(requestId),
        getMyRole(requestId),
        listResponses(requestId),
        getAcceptedHelper(requestId),
      ])
      setRequest(r)
      setRole(ro)
      setOffers(offs)
      setAccepted(acc)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }, [requestId])

  useEffect(() => {
  load()
  const timer = setInterval(load, 5000)
  return () => clearInterval(timer)
}, [load])
  async function run(action) {
    setBusy(true)
    setError('')
    try {
      await action()
      await load()
    } catch (e) {
      setError(e.message)
    }
    setBusy(false)
  }

  async function handleReport() {
    try {
      await reportRequest(requestId, 'Suspicious request')
      setNotice('Thanks. This request has been flagged for review.')
    } catch (e) {
      setError(e.message)
    }
  }

  if (!request) {
    return error ? <p className="error">{error}</p> : <p className="muted">Loading...</p>
  }

  const isOwner = role === 'owner'
  const isHelper = role === 'helper'
  const iAmAccepted = !!accepted && accepted.helper_id === myId
  const canChat = request.status !== 'open' && !!accepted && (isOwner || iAmAccepted)

  return (
    <div>
      <button className="link" onClick={onBack}>← Back to requests</button>

      <div className="card" style={{ marginTop: 12 }}>
        <span className="category">{ICONS[request.category] || '💚'} {request.category}</span>
        <span className={'badge ' + request.status}>{STATUS_LABEL[request.status]}</span>
        <h2>{request.title}</h2>
        <p>{request.description}</p>
        <p className="small muted">
          Posted by {isOwner ? 'you' : request.users?.name || 'a neighbour'} <Rating value={request.users?.rating} />
        </p>
        {request.area && <p className="small muted">📍 {request.area}</p>}
      </div>

      {error && <p className="error">{error}</p>}
      {notice && <p className="info">{notice}</p>}

      {role === 'none' && request.status === 'open' && (
        <button className="btn" disabled={busy} onClick={() => run(() => offerHelp(requestId))}>
          I can help
        </button>
      )}
      {role === 'none' && request.status !== 'open' && <p className="muted">This request already has a helper.</p>}
      {isHelper && !accepted && <div className="info">Offer sent ✓ Waiting for the owner to accept.</div>}
      {isHelper && accepted && !iAmAccepted && (
        <div className="info">The owner chose another neighbour. Thank you for offering!</div>
      )}
      {iAmAccepted && request.status === 'matched' && <div className="info">🎉 You were accepted! Use the chat below.</div>}
      {!isOwner && (
        <p>
          <button className="btn ghost small" onClick={handleReport}>⚑ Report request</button>
        </p>
      )}

      {isOwner && (
        <div className="card">
          <h3>Neighbours who offered help</h3>
          {offers.length === 0 && <p className="muted small">No offers yet. Check back soon.</p>}
          {offers.map((o) => (
            <div className="offer" key={o.id}>
              <div>
                <strong>{o.users?.name || 'Neighbour'}</strong> <Rating value={o.users?.rating} />
              </div>
              {accepted?.helper_id === o.helper_id ? (
                <span className="badge matched">Accepted ✓</span>
              ) : (
                request.status === 'open' && (
                  <button
                    className="btn secondary small"
                    disabled={busy}
                    onClick={() => run(() => acceptHelper(requestId, o.helper_id))}
                  >
                    Accept
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && request.status === 'open' && (
        <div className="card locked">
          <strong>💬 No chat yet</strong>
          <span className="muted small">Accept a helper to start chatting.</span>
        </div>
      )}

      {canChat && <Chat requestId={requestId} myId={myId} />}

      {isOwner && request.status === 'matched' && accepted && (
        <div className="card">
          <h3>Done? Rate {accepted.users?.name || 'your helper'}</h3>
          <div className="stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" className={n <= stars ? 'on' : ''} onClick={() => setStars(n)}>
                ★
              </button>
            ))}
          </div>
          <div className="field">
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Write a short review (optional)"
            />
          </div>
          <button
            className="btn"
            disabled={busy || stars === 0}
            onClick={() => run(() => completeRequest(requestId, accepted.helper_id, stars, review))}
          >
            Mark done and rate
          </button>
        </div>
      )}

      {isOwner && request.status === 'done' && (
        <div className="info">✓ Done. Thank you for building a trusted community.</div>
      )}
    </div>
  )
}