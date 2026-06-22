import React, { useEffect, useState } from 'react'

export default function DocumentViewer() {
  const [open, setOpen] = useState(false)
  const [doc, setDoc] = useState(null)

  useEffect(() => {
    function handler(e) {
      setDoc(e.detail)
      setOpen(true)
    }
    window.addEventListener('open-doc', handler)
    return () => window.removeEventListener('open-doc', handler)
  }, [])

  if (!open || !doc) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-container-lowest rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{doc.title}</h3>
          <button onClick={() => setOpen(false)} className="text-on-surface-variant">✕</button>
        </div>
        <div>
          {doc.file && doc.file.startsWith('data:') ? (
            (() => {
              const url = doc.file
              const isImage = doc.file.includes('image/png') || doc.file.includes('image/jpeg') || doc.file.includes('image/jpg') || doc.file.includes('image/gif')
              if (isImage) {
                return (
                  <img src={url} alt="document preview" className="max-h-[60vh] object-contain w-full" />
                )
              }
              return (
                <iframe src={url} title={doc.title} className="w-full h-[60vh] border" />
              )
            })()
          ) : (
            <div className="p-6 bg-surface-container-low rounded border border-outline-variant space-y-4 text-on-surface">
              <div className="flex items-center gap-2 text-primary font-bold">
                <span className="material-symbols-outlined">description</span>
                <span>Document Details</span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono bg-surface p-3 rounded border border-outline-variant">
                <strong>Source:</strong> {doc.source || doc.filename || 'Simulated file'}<br/>
                <strong>Status:</strong> {doc.indexingStatus || 'INDEXED'}<br/>
                <strong>Shard:</strong> {doc.shard ? `Shard ${doc.shard}` : 'Not assigned'}
              </p>
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Document Snippet Content</h4>
                <p className="text-sm text-on-surface leading-relaxed">{doc.snippet || 'No text snippet available.'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
