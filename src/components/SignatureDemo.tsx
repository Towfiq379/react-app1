import React, { useState, useEffect } from 'react'

interface KeyPair {
  privateKey: CryptoKey
  publicKey: CryptoKey
}

async function generateKeyPair(): Promise<KeyPair> {
  const pair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  }
}

async function signMessage(message: string, privateKey: CryptoKey): Promise<ArrayBuffer> {
  const enc = new TextEncoder().encode(message)
  return crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, enc)
}

async function verifySignature(
  message: string,
  signature: ArrayBuffer,
  publicKey: CryptoKey
): Promise<boolean> {
  const enc = new TextEncoder().encode(message)
  return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, signature, enc)
}

function bufferToHex(buf: ArrayBuffer): string {
  const arr = Array.from(new Uint8Array(buf))
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hexToBuffer(hex: string): ArrayBuffer {
  const buf = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    buf[i / 2] = parseInt(hex.substr(i, 2), 16)
  }
  return buf.buffer
}

export const SignatureDemo: React.FC = () => {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null)
  const [message, setMessage] = useState('Sign this message')
  const [signature, setSignature] = useState('')
  const [isValid, setIsValid] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [tamperedMessage, setTamperedMessage] = useState('')
  const [tamperedSignature, setTamperedSignature] = useState('')

  // Generate keypair on mount
  useEffect(() => {
    ;(async () => {
      const pair = await generateKeyPair()
      setKeyPair(pair)
    })()
  }, [])

  async function handleSign() {
    if (!keyPair) return
    setLoading(true)
    try {
      const sig = await signMessage(message, keyPair.privateKey)
      setSignature(bufferToHex(sig))
      setTamperedMessage('')
      setTamperedSignature('')
      setIsValid(null)
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify() {
    if (!keyPair || !signature) return
    setLoading(true)
    try {
      const sig = hexToBuffer(signature)
      const valid = await verifySignature(message, sig, keyPair.publicKey)
      setIsValid(valid)
      setTamperedMessage('')
      setTamperedSignature('')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyTamperedMessage() {
    if (!keyPair || !signature) return
    setLoading(true)
    try {
      const sig = hexToBuffer(signature)
      const valid = await verifySignature(tamperedMessage, sig, keyPair.publicKey)
      setIsValid(valid)
      setTamperedSignature('')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyTamperedSignature() {
    if (!keyPair || !tamperedSignature) return
    setLoading(true)
    try {
      const sig = hexToBuffer(tamperedSignature)
      const valid = await verifySignature(message, sig, keyPair.publicKey)
      setIsValid(valid)
      setTamperedMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Digital Signature Demo (ECDSA)</h2>
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        A keypair is generated on load. Sign a message with the private key, then verify
        with the public key. Try tampering with the message or signature to see verification
        fail.
      </p>

      {/* Sign Section */}
      <div style={{ marginTop: 16, padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
        <h3>1. Sign a Message</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ width: '100%', padding: 8, fontFamily: 'monospace', minHeight: 60 }}
          placeholder="Enter message to sign"
        />
        <button
          onClick={handleSign}
          disabled={loading || !keyPair}
          style={{ marginTop: 8, padding: '6px 12px' }}
        >
          {loading ? 'Signing…' : 'Sign Message'}
        </button>

        {signature && (
          <div style={{ marginTop: 12 }}>
            <strong>Signature (hex):</strong>
            <div
              style={{
                marginTop: 4,
                padding: 8,
                backgroundColor: '#f0f0f0',
                fontFamily: 'monospace',
                fontSize: '0.85em',
                wordBreak: 'break-all',
              }}
            >
              {signature}
            </div>
          </div>
        )}
      </div>

      {/* Verify Section */}
      {signature && (
        <div style={{ marginTop: 16, padding: 12, border: '1px solid #ccc', borderRadius: 4 }}>
          <h3>2. Verify Signature</h3>

          {/* Valid verify */}
          <div>
            <strong>Original message:</strong> {message}
            <br />
            <button
              onClick={handleVerify}
              disabled={loading}
              style={{ marginTop: 8, padding: '6px 12px' }}
            >
              {loading ? 'Verifying…' : 'Verify (Original)'}
            </button>
            {isValid === true && (
              <div style={{ marginTop: 8, color: 'green', fontWeight: 'bold' }}>
                ✓ Signature is VALID
              </div>
            )}
          </div>

          {/* Tampered message */}
          <div style={{ marginTop: 12 }}>
            <strong>Tamper with message:</strong>
            <textarea
              value={tamperedMessage}
              onChange={(e) => setTamperedMessage(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                fontFamily: 'monospace',
                minHeight: 40,
                marginTop: 4,
              }}
              placeholder="Modify the message here"
            />
            <button
              onClick={handleVerifyTamperedMessage}
              disabled={loading || !tamperedMessage}
              style={{ marginTop: 8, padding: '6px 12px' }}
            >
              {loading ? 'Verifying…' : 'Verify (Tampered Message)'}
            </button>
            {isValid === false && tamperedMessage && (
              <div style={{ marginTop: 8, color: 'red', fontWeight: 'bold' }}>
                ✗ Signature is INVALID (message changed)
              </div>
            )}
          </div>

          {/* Tampered signature */}
          <div style={{ marginTop: 12 }}>
            <strong>Tamper with signature:</strong>
            <textarea
              value={tamperedSignature}
              onChange={(e) => setTamperedSignature(e.target.value)}
              style={{
                width: '100%',
                padding: 8,
                fontFamily: 'monospace',
                minHeight: 40,
                marginTop: 4,
              }}
              placeholder="Modify the signature hex here"
            />
            <button
              onClick={handleVerifyTamperedSignature}
              disabled={loading || !tamperedSignature}
              style={{ marginTop: 8, padding: '6px 12px' }}
            >
              {loading ? 'Verifying…' : 'Verify (Tampered Signature)'}
            </button>
            {isValid === false && tamperedSignature && (
              <div style={{ marginTop: 8, color: 'red', fontWeight: 'bold' }}>
                ✗ Signature is INVALID (signature changed)
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SignatureDemo
