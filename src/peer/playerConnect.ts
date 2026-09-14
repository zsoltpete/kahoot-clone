/**
 * Player-side PeerJS client connecting to the host peer id derived from PIN.
 */

import Peer, { type DataConnection } from 'peerjs'
import type { HostToClient, ClientToHost } from './protocol'
import { peerIdFromPin } from './protocol'

export interface PlayerSession {
  peer: Peer
  conn: DataConnection
  send: (msg: ClientToHost) => void
  close: () => void
}

export function connectToHost(
  pin: string,
  onMessage: (msg: HostToClient) => void,
  onClose: () => void,
  onError: (message: string) => void,
): Promise<PlayerSession> {
  return new Promise((resolve, reject) => {
    const peer = new Peer({ debug: 0 })
    let settled = false
    // Always forward to latest callback via wrapper object
    const handlers = { onMessage, onClose, onError }

    const fail = (message: string) => {
      if (settled) return
      settled = true
      try {
        peer.destroy()
      } catch {
        /* ignore */
      }
      reject(new Error(message))
    }

    const timeout = setTimeout(() => fail('Csatlakozási időtúllépés'), 15000)

    peer.on('open', () => {
      const conn = peer.connect(peerIdFromPin(pin), { reliable: true })
      conn.on('open', () => {
        clearTimeout(timeout)
        settled = true
        const session: PlayerSession = {
          peer,
          conn,
          send: (msg) => {
            if (conn.open) conn.send(msg)
          },
          close: () => {
            try {
              conn.close()
            } catch {
              /* ignore */
            }
            peer.destroy()
          },
        }
        // Expose handler updater
        ;(session as PlayerSession & { setHandlers: typeof handlers }).setHandlers = handlers
        resolve(session)
      })
      conn.on('data', (raw) => handlers.onMessage(raw as HostToClient))
      conn.on('close', () => handlers.onClose())
      conn.on('error', () => handlers.onError('Kapcsolati hiba'))
    })

    peer.on('error', (err) => {
      clearTimeout(timeout)
      fail(err.message || 'PeerJS hiba')
    })
  })
}
