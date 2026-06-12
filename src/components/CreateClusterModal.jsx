import React, { useEffect, useState } from 'react'

export default function CreateClusterModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [docs, setDocs] = useState([{ title: '', snippet: '', file: null, preview: null }])
  const [errors, setErrors] = useState({})
  const ALLOWED = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
  const [serverAllowed, setServerAllowed] = useState(ALLOWED)
  const [serverMaxBytes, setServerMaxBytes] = useState(10 * 1024 * 1024)
  const MAX_BYTES = serverMaxBytes
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!open) {
      setTitle('')
      setDocs([{ title: '', snippet: '', file: null, preview: null }])
    }
    // fetch server upload config
    fetch('/api/uploads/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (cfg && Array.isArray(cfg.allowedMimes)) setServerAllowed(cfg.allowedMimes)
        if (cfg && typeof cfg.maxFileBytes === 'number') setServerMaxBytes(cfg.maxFileBytes)
      })
      .catch(() => {
        // ignore, fall back to defaults
      })
  }, [open])

  function addDoc() {
    setDocs([...docs, { title: '', snippet: '', file: null, preview: null }])
  }

  function removeDoc(idx) {
    const copy = [...docs]
    copy.splice(idx, 1)
    setDocs(copy.length ? copy : [{ title: '', snippet: '', file: null, preview: null }])
  }

  function onFileChange(e, idx) {
    const f = e.target.files && e.target.files[0]
    if (!f) return
    const copy = [...docs]
    copy[idx].file = f
    // optional: create a temporary preview for images
    if (f.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => {
        copy[idx].preview = reader.result
        setDocs(copy)
      }
      reader.readAsDataURL(f)
    } else {
      setDocs(copy)
    }
    // validate
    const errs = { ...errors }
    if (f && !serverAllowed.includes(f.type)) errs[idx] = 'Invalid file type'
    else if (f && f.size > MAX_BYTES) errs[idx] = `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB)`
    else delete errs[idx]
    setErrors(errs)
  }

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const docsPayload = docs.map((d) => ({ title: (d.title || '').trim(), snippet: (d.snippet || '').trim(), filename: d.file ? d.file.name : undefined }))
    const filtered = docsPayload.filter((d) => d.title || d.snippet || d.filename)
    if (!title.trim()) return toast('Cluster title required', 'error')
    if (filtered.length === 0) return toast('Add at least one document', 'error')
    if (Object.keys(errors).length) return toast('Please fix file errors before submitting', 'error')

    // Build FormData
    const fd = new FormData()
    fd.append('title', title.trim())
    fd.append('meta', JSON.stringify(filtered))
    docs.forEach((d) => {
      if (d.file) fd.append('files', d.file)
    })

    setUploading(true)
    setProgress(0)
    try {
      // Log files being uploaded for debug
      docs.forEach((d, i) => {
        if (d.file) console.log(`Uploading file[${i}]:`, d.file.name, d.file.type, d.file.size)
      })

      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/keywords/form')
      xhr.upload.onprogress = function (ev) {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100)
          setProgress(pct)
        }
      }
      xhr.onload = function () {
        setUploading(false)
        setProgress(100)
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const created = JSON.parse(xhr.responseText)
            onCreate(created)
            toast('Cluster created and document index started!')
            onClose()
          } catch (e) {
            // parse failed but server responded OK
            toast('Upload succeeded but response parse failed', 'error')
          }
        } else {
          // Try to show body if available
          let body = null
          try { body = JSON.parse(xhr.responseText) } catch (e) { body = xhr.responseText }
          const msg = `Upload failed: ${xhr.status} ${xhr.statusText} ${body ? JSON.stringify(body) : ''}`
          console.error(msg)
          toast(msg, 'error')
          // keep modal open so user can inspect/ retry
        }
      }
      xhr.onerror = function () {
        setUploading(false)
        const msg = 'Network error during upload'
        console.error(msg)
        toast(msg, 'error')
      }
      xhr.send(fd)
    } catch (err) {
      setUploading(false)
      console.error('Upload exception', err)
      toast('Upload failed: ' + (err && err.message ? err.message : String(err)), 'error')
    }
  }

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-surface-container-lowest rounded-lg w-full max-w-2xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Create Cluster</h3>
          <button onClick={onClose} className="text-on-surface-variant">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Cluster title" className="w-full px-3 py-2 border rounded" />
          <div className="text-xs text-on-surface-variant">Accepted: images, pdf, docx, xlsx, txt. Max size: {Math.round(MAX_BYTES / 1024 / 1024)}MB</div>
          <div className="space-y-3">
            {docs.map((d, idx) => (
              <div key={idx} className="p-3 border rounded">
                <div className="flex gap-2 mb-2">
                  <input value={d.title} onChange={(e) => { const copy = [...docs]; copy[idx].title = e.target.value; setDocs(copy) }} placeholder="Document title" className="flex-1 px-2 py-1 border rounded" />
                  <input type="file" onChange={(e) => onFileChange(e, idx)} className="w-48" />
                </div>
                <textarea value={d.snippet} onChange={(e) => { const copy = [...docs]; copy[idx].snippet = e.target.value; setDocs(copy) }} placeholder="Snippet / notes" className="w-full px-2 py-1 border rounded mb-2" />
                <div className="flex items-center justify-between">
                  <div className="text-xs text-on-surface-variant">{d.file ? d.file.name : 'No file selected'}</div>
                  <div className="flex gap-2">
                    <button type="button" disabled={uploading} onClick={() => removeDoc(idx)} className="text-red-600 text-sm">Remove</button>
                  </div>
                </div>
                {errors[idx] ? <div className="text-red-600 text-xs mt-1">{errors[idx]}</div> : null}
                {d.preview ? (
                  <div className="mt-2">
                    {/* Preview image or generic */}
                    {d.preview.startsWith('data:image') ? (
                      // eslint-disable-next-line jsx-a11y/img-redundant-alt
                      <img src={d.preview} alt="preview" className="max-h-36 object-contain" />
                    ) : (
                      <div className="text-xs text-on-surface-variant">Preview available for non-image files in viewer.</div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <button type="button" disabled={uploading} onClick={addDoc} className="px-3 py-2 border rounded">Add Doc</button>
            <button type="submit" disabled={uploading} className="px-3 py-2 bg-blue-600 text-white rounded">{uploading ? `Uploading ${progress}%` : 'Create Cluster'}</button>
            <button type="button" disabled={uploading} onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
            {uploading ? (
              <div className="w-full">
                <div className="h-2 bg-surface-container rounded mt-2">
                  <div style={{ width: `${progress}%` }} className="h-2 bg-blue-600 rounded" />
                </div>
              </div>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  )
}
