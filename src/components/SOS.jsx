
import { useEffect, useState } from 'react'
import './SOS.css'

const TABS = ['SOS', 'Steps', 'Contacts', 'Resources']

const CONTACTS = [
  { name: 'Police', number: '15', icon: '🚓' },
  { name: 'Rescue / Ambulance', number: '1122', icon: '🚑' },
  { name: 'Fire Brigade', number: '16', icon: '🚒' },
]

export default function SOS({ onClose }) {
  const [activeTab, setActiveTab] = useState('SOS')
  const [countdown, setCountdown] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (countdown === null) return

    if (countdown === 0) {
      setMessage('Demo alert completed. No emergency service or contact was notified.')
      setCountdown(null)
      return
    }

    const timer = setTimeout(() => {
      setCountdown((value) => value - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown])

  function startSOS() {
    setMessage('')
    setCountdown(3)
  }

  function cancelSOS() {
    setCountdown(null)
    setMessage('Demo alert cancelled.')
  }

  return (
    <div className="sos-overlay" onClick={onClose}>
      <section
        className="sos-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sos-title"
      >
        <header className="sos-header">
          <div>
            <h2 id="sos-title">🚨 Emergency SOS</h2>
            <p>HelpNest emergency assistance</p>
          </div>
          <button className="sos-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <nav className="sos-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? 'selected' : ''}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="sos-content">
          {activeTab === 'SOS' && (
            <div className="sos-main">
              <div className="sos-icon">SOS</div>
              <h3>Are you in an emergency?</h3>
              <p>Use the emergency contacts below if you need immediate help.</p>

              {countdown !== null ? (
                <>
                  <div className="sos-countdown">{countdown}</div>
                  <p>Demo countdown in progress...</p>
                  <button className="sos-cancel" onClick={cancelSOS}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="sos-activate" onClick={startSOS}>
                  Start SOS Demo
                </button>
              )}

              {message && <p className="sos-message">{message}</p>}

              <p className="sos-disclaimer">
                Demo only. This button does not call emergency services,
                share your location or notify neighbours.
              </p>
            </div>
          )}

          {activeTab === 'Steps' && (
            <div>
              <h3>What to do in an emergency</h3>
              <ol className="sos-list">
                <li>Stay calm and move to a safe location if possible.</li>
                <li>Call the appropriate emergency service.</li>
                <li>Share your exact location with the responder.</li>
                <li>Contact a trusted person nearby.</li>
                <li>Follow instructions from emergency professionals.</li>
              </ol>
            </div>
          )}

          {activeTab === 'Contacts' && (
            <div>
              <h3>Emergency contacts — Pakistan</h3>
              {CONTACTS.map((contact) => (
                <div className="sos-contact" key={contact.number}>
                  <span>{contact.icon} {contact.name}</span>
                  <a href={`tel:${contact.number}`}>{contact.number} · Call</a>
                </div>
              ))}
              <p className="sos-disclaimer">
                Verify local service availability before relying on these numbers.
              </p>
            </div>
          )}

          {activeTab === 'Resources' && (
            <div>
              <h3>Emergency resources</h3>
              <div className="sos-resource">
                <span>🏥</span>
                <div>
                  <strong>Nearest hospital</strong>
                  <p>Find a nearby hospital using your maps application.</p>
                  <a
                    href="https://www.google.com/maps/search/hospitals+near+me"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find hospitals
                  </a>
                </div>
              </div>
              <div className="sos-resource">
                <span>💊</span>
                <div>
                  <strong>Nearby pharmacy</strong>
                  <p>Search for an available pharmacy nearby.</p>
                  <a
                    href="https://www.google.com/maps/search/pharmacy+near+me"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find pharmacies
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
