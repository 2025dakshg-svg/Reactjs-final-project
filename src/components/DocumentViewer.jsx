import React, { useEffect, useState } from 'react'

export default function DocumentViewer() {
  const [open, setOpen] = useState(false)
  const [doc, setDoc] = useState(null)
  const [reachable, setReachable] = useState(true)

  useEffect(() => {
    function handler(e) {
      setDoc(e.detail)
      setReachable(true)
      setOpen(true)
    }
    window.addEventListener('open-doc', handler)
    return () => window.removeEventListener('open-doc', handler)
  }, [])

  useEffect(() => {
    if (!open || !doc) return
    if (doc.file && doc.file.startsWith('/uploads/')) {
      // ask server if file exists (use HEAD)
      const checkUrl = `/api/uploads/check?path=${encodeURIComponent(doc.file)}`
      fetch(checkUrl, { method: 'HEAD' })
        .then((r) => r.json())
        .then((j) => {
          setReachable(!!j && j.ok === true)
        })
        .catch(() => setReachable(false))
    } else {
      setReachable(true)
    }
  }, [open, doc])

  if (!open || !doc) return null
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-container-lowest rounded-lg w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">{doc.title}</h3>
          <button onClick={() => setOpen(false)} className="text-on-surface-variant">✕</button>
        </div>
        <div>
          {doc.file ? (
            (() => {
              // prefer direct serve endpoint to avoid relying on dev proxy
              const url = doc.file.startsWith('/') ? `/api/uploads/serve?path=${encodeURIComponent(doc.file)}` : doc.file
              if (!reachable) {
                return (
                  <div className="p-6 text-center">
                    <div className="text-lg font-medium mb-2">File not found</div>
                    <div className="text-sm text-on-surface-variant">The file at <code className="break-all">{doc.file}</code> could not be reached. Please check the server logs and ensure the dev proxy is running.</div>
                  </div>
                )
              }

              return (doc.file.endsWith('.png') || doc.file.endsWith('.jpg') || doc.file.endsWith('.jpeg') || doc.file.endsWith('.gif')) ? (
                // eslint-disable-next-line jsx-a11y/img-redundant-alt
                <img src={url} alt="document preview" className="max-h-[60vh] object-contain w-full" />
              ) : (
                <iframe src={url} title={doc.title} className="w-full h-[60vh] border" />
              )
            })()
          ) : doc.content ? (
            doc.content.startsWith('data:image') ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={doc.content} alt="document preview" className="max-h-[60vh] object-contain w-full" />
            ) : (
              <div className="whitespace-pre-wrap text-sm">{doc.snippet || 'No preview available for this file.'}</div>
            )
          ) : (
            <div className="text-sm">{doc.snippet || 'No preview available.'}</div>
          )}
        </div>
      </div>
    </div>
  )
}
