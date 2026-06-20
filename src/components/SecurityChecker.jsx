import React, { useEffect, useState } from 'react'
import { getDB, toggleSecurityStatus, verifySecurityChecksum, subscribe } from '../utils/db'

export default function SecurityChecker() {
  const [securityData, setSecurityData] = useState([])
  const [verifyingId, setVerifyingId] = useState(null)

  useEffect(() => {
    load()
    window.addEventListener('reload-data', load)
    const unsubscribe = subscribe(load)
    return () => {
      window.removeEventListener('reload-data', load)
      unsubscribe()
    }
  }, [])

  function load() {
    const dbSecurity = getDB().security || []
    setSecurityData(dbSecurity)
  }

  function toggle(id) {
    toggleSecurityStatus(id)
    load()
  }

  function verifyChecksum(id) {
    setVerifyingId(id)
    setTimeout(() => {
      try {
        const res = verifySecurityChecksum(id)
        setVerifyingId(null)
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: res.message, type: res.verified ? 'success' : 'error' } }))
        load()
      } catch (err) {
        setVerifyingId(null)
        window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Verification failed: ' + err.message, type: 'error' } }))
      }
    }, 700)
  }

  const getBadgeStyle = (status) => {
    if (status === 'VERIFIED') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
    if (status === 'TAMPERED') return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-900/50 font-black'
    return 'bg-surface-container text-on-surface border border-outline-variant'
  }

  return (
    <div className="col-span-12 md:col-span-4 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-on-tertiary-container/10 flex items-center justify-center text-on-tertiary-container">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
        </div>
        <h3 className="font-headline-sm text-headline-sm">Security Checker</h3>
      </div>
      
      <div className="space-y-3">
        {securityData.map((item) => (
          <div key={item.id} className="p-3 bg-surface-container-low rounded border border-outline-variant space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-body-md text-body-md font-bold">{item.name}</span>
              <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded ${getBadgeStyle(item.status)}`}>
                {item.status}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs text-on-surface-variant font-mono gap-4">
              <span className="truncate flex-1 opacity-60" title={item.checksum}>
                MD5: {item.checksum || 'Generating...'}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => verifyChecksum(item.id)} 
                  disabled={verifyingId === item.id}
                  className="px-2.5 py-1 bg-primary text-white text-[9px] font-black uppercase rounded hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {verifyingId === item.id ? 'Checking...' : 'Verify'}
                </button>
                <button 
                  onClick={() => toggle(item.id)} 
                  className="px-2 py-1 text-[9px] font-bold uppercase text-on-surface-variant hover:text-on-surface border border-outline-variant rounded bg-surface hover:bg-surface-container-low transition-colors"
                >
                  Toggle
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <p className="font-body-sm text-body-sm text-on-surface-variant italic">
        Checksum verification active across 12,000 document nodes.
      </p>
    </div>
  )
}
