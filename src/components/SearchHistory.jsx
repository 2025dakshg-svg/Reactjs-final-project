import React, { useEffect, useState } from 'react'
import { getDB, undoLastChange, restoreHistory, subscribe } from '../utils/db'

export default function SearchHistory() {
  const [history, setHistory] = useState([])

  useEffect(() => {
    load()
    
    // Listen for custom reload event to update history dynamically
    window.addEventListener('reload-data', load)
    const unsubscribe = subscribe(load)
    return () => {
      window.removeEventListener('reload-data', load)
      unsubscribe()
    }
  }, [])

  function load() {
    const dbHistory = getDB().history || []
    setHistory(dbHistory)
  }

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
  }

  const confirmAction = (message, onConfirm) => {
    window.dispatchEvent(new CustomEvent('show-confirm', { detail: { message, onConfirm } }))
  }

  function restore(id) {
    confirmAction('Restore this previous search tag state?', () => {
      try {
        restoreHistory(id)
        toast('Settings state successfully restored!')
        window.dispatchEvent(new CustomEvent('reload-data'))
      } catch (err) {
        toast('Restore failed: ' + err.message, 'error')
      }
    })
  }

  function handleUndo() {
    try {
      undoLastChange()
      toast('Last change successfully undone!')
      window.dispatchEvent(new CustomEvent('reload-data'))
    } catch (err) {
      toast('Undo failed: ' + err.message, 'error')
    }
  }

  const getIconName = (type) => {
    if (type === 'update') return 'edit_note'
    if (type === 'modified') return 'filter_alt'
    return 'history'
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-surface-variant">history</span>
          <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider">Search Settings History</h3>
        </div>
        <button 
          onClick={handleUndo}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-sm text-label-sm font-semibold"
        >
          <span className="material-symbols-outlined text-sm">undo</span>
          Undo Last Property Change
        </button>
      </div>
      <div className="divide-y divide-outline-variant">
        {history.map((item) => (
          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors group">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-on-tertiary-container/5 rounded">
                <span className="material-symbols-outlined text-on-tertiary-container">
                  {getIconName(item.type)}
                </span>
              </div>
              <div>
                <p className="font-body-md text-body-md text-on-surface">
                  {item.title}
                  {item.tag && (
                    <span className="font-label-md text-label-md px-2 py-0.5 bg-surface-container border border-outline-variant rounded ml-2 font-mono">
                      {item.tag}
                    </span>
                  )}
                </p>
                <p className="font-label-sm text-label-sm text-on-surface-variant">{item.timestamp}</p>
              </div>
            </div>
            {item.snapshot && (
              <button 
                onClick={() => restore(item.id)} 
                className="px-2.5 py-1 text-xs border border-primary text-primary rounded bg-surface hover:bg-primary/5 transition-all font-bold cursor-pointer select-none"
              >
                Restore State
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
