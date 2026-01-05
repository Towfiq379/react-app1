import React, { useState } from 'react'

async function sha256HexFromBytes(bytes: Uint8Array): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', bytes)
  const arr = Array.from(new Uint8Array(buf))
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input)
  return sha256HexFromBytes(enc)
}

function hexToBits(hex: string): string {
  return hex
    .split('')
    .map((h) => parseInt(h, 16).toString(2).padStart(4, '0'))
    .join('')
}

function hamming(a: string, b: string): number {
  let cnt = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) cnt++
  return cnt
}

function mutateByteFlip(input: string, byteIndex = 0, bitMask = 1): Uint8Array {
  const enc = new TextEncoder().encode(input)
  if (enc.length === 0) return enc
  const arr = new Uint8Array(enc)
  arr[byteIndex % arr.length] = arr[byteIndex % arr.length] ^ bitMask
  return arr
}

function mutateCharChange(input: string, index = 0, newChar = 'Z'): Uint8Array {
  const enc = new TextEncoder().encode(input)
  if (enc.length === 0) return enc
  const arr = new Uint8Array(enc)
  arr[(index + arr.length) % arr.length] = new TextEncoder().encode(newChar)[0]
  return arr
}

export const HashAvalanche: React.FC = () => {
  const [input, setInput] = useState('The quick brown fox jumps over the lazy dog')
  const [results, setResults] = useState<
    { name: string; hex: string; bits: string; bytes: Uint8Array }[]
  >([])
  const [running, setRunning] = useState(false)

  async function run() {
    setRunning(true)
    const baseBytes = new TextEncoder().encode(input)

    const variants: { name: string; bytes: Uint8Array }[] = [
      { name: 'original', bytes: baseBytes },
      { name: 'append space', bytes: new TextEncoder().encode(input + ' ') },
      { name: 'change first char', bytes: mutateCharChange(input, 0, 'Z') },
      { name: 'flip one bit in first byte', bytes: mutateByteFlip(input, 0, 1) },
      { name: 'flip 0x80 bit in first byte', bytes: mutateByteFlip(input, 0, 0x80) },
      { name: 'change last char', bytes: mutateCharChange(input, -1, 'z') },
    ]

    const computed = [] as { name: string; hex: string; bits: string; bytes: Uint8Array }[]
    for (const v of variants) {
      const hex = await sha256HexFromBytes(v.bytes)
      const bits = hexToBits(hex)
      computed.push({ name: v.name, hex, bits, bytes: v.bytes })
    }

    setResults(computed)
    setRunning(false)
  }

  const baseBits = results.length ? results[0].bits : ''

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Hash Avalanche Demo (SHA-256)</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{ flex: 1, padding: '6px 8px' }}
        />
        <button onClick={run} disabled={running} style={{ padding: '6px 12px' }}>
          {running ? 'Running…' : 'Hash'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left' }}>
                <th>Name</th>
                <th>SHA-256</th>
                <th>Bits changed vs original</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => {
                if (i === 0) {
                  return (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td style={{ fontFamily: 'monospace' }}>{r.hex}</td>
                      <td>-</td>
                    </tr>
                  )
                }
                const dist = baseBits ? hamming(baseBits, r.bits) : 0
                const pct = ((dist / 256) * 100).toFixed(1)
                return (
                  <tr key={r.name}>
                    <td>{r.name}</td>
                    <td style={{ fontFamily: 'monospace' }}>{r.hex}</td>
                    <td>{`${dist}/256 bits changed (${pct}%)`}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default HashAvalanche
