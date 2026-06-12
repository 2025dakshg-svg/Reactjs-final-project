import React from 'react'

export default function ClusterViewer({ open, onClose, cluster }) {
  if (!open || !cluster) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-container-lowest rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{cluster.title}</h3>
          <button onClick={onClose} className="text-on-surface-variant">✕</button>
        </div>
        <div className="space-y-3">
          {(cluster.docs || []).map((d) => (
            <div key={d.id} className="p-3 border rounded flex items-start gap-3">
              <div className="flex-1">
                <div className="font-medium">{d.title}</div>
                <div className="text-sm text-on-surface-variant">{d.snippet}</div>
                <div className="text-xs text-on-surface-variant mt-1">Source: {d.source || d.filename || '—'}</div>
              </div>
              <div>
                <button className="px-3 py-1 border rounded" onClick={() => window.dispatchEvent(new CustomEvent('open-doc', { detail: d }))}>Open</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
