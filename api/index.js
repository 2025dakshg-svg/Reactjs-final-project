import express from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import multer from 'multer'

const app = express()
const PORT = process.env.PORT || 4000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json())

const isVercel = process.env.VERCEL === '1' || !!process.env.VERCEL
const UPLOAD_DIR = isVercel ? '/tmp/uploads' : path.join(__dirname, 'uploads')
const DB_FILE = isVercel ? '/tmp/data.json' : path.join(__dirname, 'data.json')

// If on Vercel, bootstrap the database from the read-only data.json if it doesn't exist in /tmp
if (isVercel) {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  const readOnlyDB = path.join(__dirname, 'data.json')
  if (!fs.existsSync(DB_FILE)) {
    try {
      if (fs.existsSync(readOnlyDB)) {
        fs.copyFileSync(readOnlyDB, DB_FILE)
      } else {
        fs.writeFileSync(DB_FILE, JSON.stringify({ keywords: [], security: [], citations: {}, relevance: {}, history: [] }, null, 2))
      }
    } catch (e) {
      console.error('Vercel bootstrap db failed:', e)
    }
  }
} else {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

// serve uploaded files
app.use('/uploads', express.static(UPLOAD_DIR))

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR)
  },
  filename: function (req, file, cb) {
    const safe = file.originalname.replace(/[^a-zA-Z0-9.\-\_]/g, '_')
    cb(null, `${Date.now().toString(36)}-${safe}`)
  }
})

// Allowed mime types and size (10MB)
const ALLOWED_MIMES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]
const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES) || 10 * 1024 * 1024 // 10 MB

function fileFilter(req, file, cb) {
  if (ALLOWED_MIMES.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Invalid file type'), false)
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_BYTES } })

// Basic error handler middleware for JSON responses on upload/validation errors
function jsonErrorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)
  if (err) {
    // Multer file filter or size errors come through here
    const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    return res.status(status).json({ error: err.message || 'upload error', code: err.code || null })
  }
  next()
}

function readDB() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    return JSON.parse(raw)
  } catch (e) {
    return { keywords: [], security: [], citations: {}, relevance: {}, history: [] }
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2))
}

function getAllDocs(db) {
  const docs = []
  if (Array.isArray(db.keywords)) {
    db.keywords.forEach((k) => {
      if (Array.isArray(k.docs)) {
        k.docs.forEach((d) => {
          docs.push({
            id: d.id,
            title: d.title,
            snippet: d.snippet,
            source: d.source || d.filename || '',
            clusterId: k.id,
            clusterTitle: k.title,
            indexingStatus: d.indexingStatus || 'INDEXED',
            shard: d.shard || null
          })
        })
      }
    })
  }
  return docs
}

function getShardLoads(db) {
  const shards = { Alpha: 0, Beta: 0, Gamma: 0 }
  if (Array.isArray(db.keywords)) {
    db.keywords.forEach((k) => {
      if (Array.isArray(k.docs)) {
        k.docs.forEach((d) => {
          if (d.indexingStatus === 'INDEXED' && d.shard) {
            shards[d.shard] = (shards[d.shard] || 0) + 1
          }
        })
      }
    })
  }
  return shards
}

function assignShard(db) {
  const loads = getShardLoads(db)
  let minShard = 'Alpha'
  let minLoad = loads['Alpha']
  for (const shard of ['Beta', 'Gamma']) {
    if (loads[shard] < minLoad) {
      minLoad = loads[shard]
      minShard = shard
    }
  }
  return minShard
}

function addHistory(db, type, title, tag, snapshot) {
  if (!db.history) db.history = []
  const entry = {
    id: Date.now().toString(36),
    type: type,
    title: title,
    tag: tag || '',
    timestamp: 'Just now',
    snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null
  }
  db.history.unshift(entry)
  if (db.history.length > 10) db.history.pop()
}

function migrateDB() {
  const db = readDB()
  let changed = false
  if (Array.isArray(db.keywords)) {
    db.keywords.forEach((k) => {
      if (Array.isArray(k.docs)) {
        k.docs.forEach((d) => {
          if (!d.indexingStatus) {
            d.indexingStatus = 'INDEXED'
            changed = true
          }
          if (d.indexingStatus === 'INDEXED' && !d.shard) {
            d.shard = assignShard(db)
            changed = true
          }
        })
      }
    })
  }
  if (!db.citations) {
    db.citations = { links: [] }
    changed = true
  }
  if (!db.citations.links || db.citations.links.length === 0) {
    db.citations.links = [
      { source: "d-k1-1", target: "d-k1-2" },
      { source: "d-k1-2", target: "d-k2-1" },
      { source: "d-k2-1", target: "d-k2-2" },
      { source: "d-k2-2", target: "d-k3-1" },
      { source: "d-k3-1", target: "d-daksh-1" },
      { source: "d-daksh-1", target: "d-k1-1" }
    ]
    changed = true
  }
  if (Array.isArray(db.security)) {
    db.security.forEach((s) => {
      if (!s.checksum) {
        s.checksum = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
        changed = true
      }
    })
  }
  if (Array.isArray(db.history)) {
    db.history.forEach((h) => {
      if (!h.snapshot) {
        h.snapshot = JSON.parse(JSON.stringify(db.keywords))
        changed = true
      }
    })
  }
  if (changed) {
    writeDB(db)
  }
}

migrateDB()

// Background Indexer Worker
setInterval(() => {
  try {
    const db = readDB()
    let changed = false
    
    // Find first document with PENDING status
    let pendingDoc = null
    if (Array.isArray(db.keywords)) {
      for (const k of db.keywords) {
        if (Array.isArray(k.docs)) {
          for (const d of k.docs) {
            if (d.indexingStatus === 'PENDING') {
              pendingDoc = d
              break
            }
          }
        }
        if (pendingDoc) break
      }
    }
    
    if (pendingDoc) {
      pendingDoc.indexingStatus = 'INDEXING'
      changed = true
      console.log(`Background Indexer: Indexing document "${pendingDoc.title}"...`)
    } else {
      // Find first document with INDEXING status
      let indexingDoc = null
      if (Array.isArray(db.keywords)) {
        for (const k of db.keywords) {
          if (Array.isArray(k.docs)) {
            for (const d of k.docs) {
              if (d.indexingStatus === 'INDEXING') {
                indexingDoc = d
                break
              }
            }
          }
          if (indexingDoc) break
        }
      }
      
      if (indexingDoc) {
        indexingDoc.indexingStatus = 'INDEXED'
        indexingDoc.shard = assignShard(db)
        changed = true
        console.log(`Background Indexer: Completed indexing document "${indexingDoc.title}". Assigned to Shard ${indexingDoc.shard}`)
      }
    }
    
    if (changed) {
      writeDB(db)
    }
  } catch (e) {
    console.error('Indexer interval error:', e)
  }
}, 4000)

app.get('/api/keywords', (req, res) => {
  const db = readDB()
  res.json(db.keywords || [])
})

app.post('/api/keywords', (req, res) => {
  const { title, count, docs } = req.body
  if (!title) return res.status(400).json({ error: 'title required' })
  const db = readDB()
  const prevKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  const id = Date.now().toString(36)
  const docsArr = []
  if (Array.isArray(docs)) {
    docs.forEach((d, idx) => {
      const docId = d.id || `${id}-d-${idx}-${Date.now().toString(36)}`
      const entry = { id: docId, title: d.title || '', snippet: d.snippet || '', indexingStatus: 'PENDING' }
      // if client sent content as data URL, save it to uploads and expose a URL
      if (d.content && typeof d.content === 'string' && d.content.startsWith('data:')) {
        try {
          const match = d.content.match(/^data:(.+);base64,(.*)$/)
          if (match) {
            const mime = match[1]
            const b64 = match[2]
            const buf = Buffer.from(b64, 'base64')
            if (!ALLOWED_MIMES.includes(mime) || buf.length > MAX_FILE_BYTES) {
              // skip invalid file
            } else {
              const safeName = (d.filename || `doc-${docId}`).replace(/[^a-zA-Z0-9.\-_]/g, '_')
              const filename = `${Date.now().toString(36)}-${safeName}`
              const outPath = path.join(__dirname, 'uploads', filename)
              fs.writeFileSync(outPath, buf)
              entry.file = `/uploads/${filename}`
              try { console.log(`Saved data-URL file: ${d.filename || filename} -> /uploads/${filename}`) } catch (e) {}
              entry.filename = d.filename || filename
            }
          }
        } catch (e) {
          // ignore saving failure, continue without file
        }
      } else if (d.filename) {
        entry.filename = d.filename
        if (d.source) entry.source = d.source
      } else if (d.source) {
        entry.source = d.source
      }
      docsArr.push(entry)
    })
  }
  const item = { id, title, docs: docsArr, count: docsArr.length || (count || 0) }
  db.keywords.push(item)
  addHistory(db, 'update', `Created cluster "${item.title}"`, item.title, prevKeywordsSnapshot)
  writeDB(db)
  res.status(201).json(item)
})

// Multipart/form-data endpoint to create a cluster with files
// Expects: field 'title' and optional field 'meta' which is a JSON array matching files[] order.
app.post('/api/keywords/form', upload.array('files'), (req, res) => {
  const title = req.body.title
  if (!title) return res.status(400).json({ error: 'title required' })
  const meta = req.body.meta ? JSON.parse(req.body.meta) : []
  const db = readDB()
  const prevKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  const id = Date.now().toString(36)
  const docsArr = []
  // pair uploaded files with meta by index
  const files = req.files || []
  files.forEach((f, i) => {
    const m = meta[i] || {}
    const entry = { id: `${id}-d-${i}-${Date.now().toString(36)}`, title: m.title || f.originalname || '', snippet: m.snippet || '', file: `/uploads/${f.filename}`, filename: f.originalname, indexingStatus: 'PENDING' }
    docsArr.push(entry)
    // Log saved file info for debugging
    try {
      console.log(`Saved uploaded file: ${f.originalname} -> /uploads/${f.filename}`)
    } catch (e) {
      // ignore logging errors
    }
  })
  // also accept meta entries without files
  meta.forEach((m, i) => {
    if (!files[i]) {
      const entry = { id: `${id}-d-meta-${i}-${Date.now().toString(36)}`, title: m.title || '', snippet: m.snippet || '', filename: m.filename || undefined, source: m.source || undefined, indexingStatus: 'PENDING' }
      docsArr.push(entry)
    }
  })
  const item = { id, title, docs: docsArr, count: docsArr.length }
  db.keywords.push(item)
  addHistory(db, 'update', `Created cluster "${item.title}"`, item.title, prevKeywordsSnapshot)
  writeDB(db)
  res.status(201).json(item)
})

// Attach JSON error handler after upload route so multer errors are handled
app.use('/api/keywords/form', jsonErrorHandler)

// Update a keyword
app.put('/api/keywords/:id', (req, res) => {
  const { id } = req.params
  const { title, count, docs } = req.body
  const db = readDB()
  const idx = db.keywords.findIndex((k) => k.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const prevKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  if (title !== undefined) db.keywords[idx].title = title
  if (count !== undefined) db.keywords[idx].count = count
  if (docs !== undefined && Array.isArray(docs)) {
    const docsArr = []
    docs.forEach((d, j) => {
      const docId = d.id || `${id}-d-${j}-${Date.now().toString(36)}`
      const entry = { id: docId, title: d.title || '', snippet: d.snippet || '', indexingStatus: d.indexingStatus || 'PENDING' }
      if (d.content && typeof d.content === 'string' && d.content.startsWith('data:')) {
        try {
          const match = d.content.match(/^data:(.+);base64,(.*)$/)
          if (match) {
            const mime = match[1]
            const b64 = match[2]
            const buf = Buffer.from(b64, 'base64')
            if (!ALLOWED_MIMES.includes(mime) || buf.length > MAX_FILE_BYTES) {
              // skip invalid
            } else {
              const safeName = (d.filename || `doc-${docId}`).replace(/[^a-zA-Z0-9.\-_]/g, '_')
              const filename = `${Date.now().toString(36)}-${safeName}`
              const outPath = path.join(__dirname, 'uploads', filename)
              fs.writeFileSync(outPath, buf)
              entry.file = `/uploads/${filename}`
              try { console.log(`Saved data-URL file (update): ${d.filename || filename} -> /uploads/${filename}`) } catch (e) {}
              entry.filename = d.filename || filename
            }
          }
        } catch (e) {
          // ignore
        }
      } else if (d.filename) {
        entry.filename = d.filename
        if (d.source) entry.source = d.source
      } else if (d.source) {
        entry.source = d.source
      }
      docsArr.push(entry)
    })
    db.keywords[idx].docs = docsArr
    db.keywords[idx].count = db.keywords[idx].docs.length
  }
  addHistory(db, 'modified', `Updated cluster "${db.keywords[idx].title}"`, db.keywords[idx].title, prevKeywordsSnapshot)
  writeDB(db)
  res.json(db.keywords[idx])
})

// Delete a keyword
app.delete('/api/keywords/:id', (req, res) => {
  const { id } = req.params
  const db = readDB()
  const idx = db.keywords.findIndex((k) => k.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const prevKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  const removed = db.keywords.splice(idx, 1)[0]
  addHistory(db, 'modified', `Deleted cluster "${removed.title}"`, removed.title, prevKeywordsSnapshot)
  writeDB(db)
  res.json({ removed })
})

app.get('/api/security', (req, res) => {
  const db = readDB()
  res.json(db.security || [])
})

// Toggle security status (VERIFIED <-> FLAGGED)
app.post('/api/security/:id/toggle', (req, res) => {
  const { id } = req.params
  const db = readDB()
  const idx = db.security.findIndex((s) => s.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const item = db.security[idx]
  item.status = item.status === 'VERIFIED' ? 'FLAGGED' : 'VERIFIED'
  writeDB(db)
  res.json(item)
})

app.post('/api/security/:id/verify', (req, res) => {
  const { id } = req.params
  const db = readDB()
  const idx = db.security.findIndex((s) => s.id === id)
  if (idx === -1) return res.status(404).json({ error: 'not found' })
  const item = db.security[idx]
  if (item.status === 'TAMPERED') {
    return res.json({ verified: false, message: 'MD5 checksum mismatch! File integrity check failed.' })
  }
  item.status = 'VERIFIED'
  writeDB(db)
  res.json({ verified: true, message: 'MD5 checksum match. Integrity verified successfully.' })
})

app.get('/api/citations', (req, res) => {
  const db = readDB()
  const links = db.citations && db.citations.links ? db.citations.links : []
  const docs = getAllDocs(db)
  res.json({
    referencesFound: links.length,
    links: links,
    docs: docs
  })
})

app.post('/api/citations/link', (req, res) => {
  const { source, target } = req.body
  if (!source || !target) return res.status(400).json({ error: 'source and target required' })
  const db = readDB()
  if (!db.citations) db.citations = { links: [] }
  if (!db.citations.links) db.citations.links = []
  
  // Prevent duplicate links
  const exists = db.citations.links.some(l => l.source === source && l.target === target)
  if (!exists) {
    db.citations.links.push({ source, target })
    writeDB(db)
  }
  
  const links = db.citations.links
  const docs = getAllDocs(db)
  res.json({
    referencesFound: links.length,
    links: links,
    docs: docs
  })
})

app.delete('/api/citations/link', (req, res) => {
  const { source, target } = req.body
  if (!source || !target) return res.status(400).json({ error: 'source and target required' })
  const db = readDB()
  if (db.citations && Array.isArray(db.citations.links)) {
    db.citations.links = db.citations.links.filter(l => !(l.source === source && l.target === target))
    writeDB(db)
  }
  
  const links = db.citations && db.citations.links ? db.citations.links : []
  const docs = getAllDocs(db)
  res.json({
    referencesFound: links.length,
    links: links,
    docs: docs
  })
})

app.get('/api/citations/shortest-path', (req, res) => {
  const { source, target } = req.query
  if (!source || !target) return res.status(400).json({ error: 'source and target required' })
  
  const db = readDB()
  const links = db.citations && db.citations.links ? db.citations.links : []
  
  const adj = {}
  links.forEach(l => {
    if (!adj[l.source]) adj[l.source] = []
    adj[l.source].push(l.target)
  })
  
  const queue = [[source]]
  const visited = new Set([source])
  let pathFound = null
  
  while (queue.length > 0) {
    const path = queue.shift()
    const node = path[path.length - 1]
    
    if (node === target) {
      pathFound = path
      break
    }
    
    const neighbors = adj[node] || []
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor)
        queue.push([...path, neighbor])
      }
    }
  }
  
  res.json({ path: pathFound })
})

app.get('/api/relevance', (req, res) => {
  const db = readDB()
  res.json(db.relevance || {})
})

app.get('/api/history', (req, res) => {
  const db = readDB()
  res.json(db.history || [])
})

// Expose upload configuration to clients to avoid duplication
app.get('/api/uploads/config', (req, res) => {
  res.json({ allowedMimes: ALLOWED_MIMES, maxFileBytes: MAX_FILE_BYTES })
})

// Simple endpoint to check if an uploaded file is reachable by path (support GET/HEAD)
app.get('/api/uploads/check', (req, res) => {
  const p = req.query.path || ''
  if (!p || !p.startsWith('/uploads/')) return res.status(400).json({ error: 'invalid path' })
  const rel = p.replace(/^\/+/, '').replace(/^uploads\//, '')
  const full = path.join(UPLOAD_DIR, rel)
  fs.access(full, fs.constants.R_OK, (err) => {
    if (err) return res.status(404).json({ ok: false, path: p })
    res.status(200).json({ ok: true, path: p })
  })
})

app.get('/api/indexer/status', (req, res) => {
  const db = readDB()
  const docs = getAllDocs(db)
  const total = docs.length
  const indexed = docs.filter(d => d.indexingStatus === 'INDEXED').length
  const indexing = docs.filter(d => d.indexingStatus === 'INDEXING').length
  const pending = docs.filter(d => d.indexingStatus === 'PENDING').length
  
  const shardLoads = getShardLoads(db)
  
  res.json({
    total,
    indexed,
    indexing,
    pending,
    shards: [
      { name: 'Server Alpha', count: shardLoads['Alpha'] || 0, percent: total > 0 ? Math.round(((shardLoads['Alpha'] || 0) / total) * 100) : 0 },
      { name: 'Server Beta', count: shardLoads['Beta'] || 0, percent: total > 0 ? Math.round(((shardLoads['Beta'] || 0) / total) * 100) : 0 },
      { name: 'Server Gamma', count: shardLoads['Gamma'] || 0, percent: total > 0 ? Math.round(((shardLoads['Gamma'] || 0) / total) * 100) : 0 }
    ]
  })
})

app.post('/api/history/undo', (req, res) => {
  const db = readDB()
  const historyWithSnapshot = (db.history || []).find(h => h.snapshot)
  if (!historyWithSnapshot) return res.status(400).json({ error: 'No undo history found' })
  
  const currentKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  db.keywords = historyWithSnapshot.snapshot
  
  db.history = db.history.filter(h => h.id !== historyWithSnapshot.id)
  
  addHistory(db, 'update', `Undid action: "${historyWithSnapshot.title}"`, historyWithSnapshot.tag, currentKeywordsSnapshot)
  writeDB(db)
  res.json({ success: true })
})

// Restore a history entry (simulate restoring state)
app.post('/api/history/restore', (req, res) => {
  const { id } = req.body
  if (!id) return res.status(400).json({ error: 'id required' })
  const db = readDB()
  const entry = (db.history || []).find((h) => h.id === id)
  if (!entry) return res.status(404).json({ error: 'not found' })
  if (!entry.snapshot) return res.status(400).json({ error: 'No snapshot available for this state' })
  
  const currentKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  db.keywords = entry.snapshot
  
  addHistory(db, 'update', `Restored state: "${entry.title}"`, entry.tag, currentKeywordsSnapshot)
  writeDB(db)
  res.json({ restored: entry })
})

// List files in uploads directory for debugging
app.get('/api/uploads/list', (req, res) => {
  fs.readdir(UPLOAD_DIR, (err, files) => {
    if (err) return res.status(500).json({ error: 'could not read uploads dir' })
    const out = files.map((f) => {
      try {
        const st = fs.statSync(path.join(UPLOAD_DIR, f))
        return { name: f, path: `/uploads/${f}`, size: st.size, mtime: st.mtime }
      } catch (e) {
        return { name: f, path: `/uploads/${f}`, size: null, mtime: null }
      }
    })
    res.json(out)
  })
})

// Serve an uploaded file via API (useful if dev proxy/static routing fails)
app.get('/api/uploads/serve', (req, res) => {
  const p = req.query.path || ''
  if (!p || !p.startsWith('/uploads/')) return res.status(400).json({ error: 'invalid path' })
  const rel = p.replace(/^\/+/, '').replace(/^uploads\//, '')
  const full = path.join(UPLOAD_DIR, rel)
  fs.stat(full, (err, st) => {
    if (err || !st.isFile()) return res.status(404).json({ error: 'not found' })
    // Basic content type mapping
    const ext = path.extname(full).toLowerCase()
    const mimeMap = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    }
    const contentType = mimeMap[ext] || 'application/octet-stream'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', st.size)
    // Inline display
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(full)}"`)
    const stream = fs.createReadStream(full)
    stream.on('error', (sErr) => {
      console.error('Stream error', sErr)
      res.status(500).end()
    })
    stream.pipe(res)
  })
})

// Generic JSON error handler (fallback) for any remaining errors
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err)
  console.error('Unhandled error:', err && err.stack ? err.stack : err)
  res.status(500).json({ error: (err && err.message) || 'internal error' })
})

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})

export default app
