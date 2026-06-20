import defaultData from '../defaultData.json'

let db = null

try {
  const raw = localStorage.getItem('slate_db')
  if (raw) {
    db = JSON.parse(raw)
  }
} catch (e) {
  console.error('Failed to parse local slate_db, resetting:', e)
}

if (!db) {
  db = JSON.parse(JSON.stringify(defaultData))
  localStorage.setItem('slate_db', JSON.stringify(db))
}

const listeners = new Set()

export function getDB() {
  return db
}

export function writeDB(newDB) {
  db = { ...newDB }
  localStorage.setItem('slate_db', JSON.stringify(db))
  listeners.forEach((l) => l(db))
  // Broadcast reload event to any vanilla/non-React-state consumers
  window.dispatchEvent(new CustomEvent('reload-data'))
}

export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Add state to history
export function addHistory(type, title, tag, snapshot) {
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

// Undo Last Change
export function undoLastChange() {
  const historyWithSnapshot = (db.history || []).find((h) => h.snapshot)
  if (!historyWithSnapshot) throw new Error('No undo history found')
  
  const currentKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  db.keywords = historyWithSnapshot.snapshot
  db.history = db.history.filter((h) => h.id !== historyWithSnapshot.id)
  
  addHistory('update', `Undid action: "${historyWithSnapshot.title}"`, historyWithSnapshot.tag, currentKeywordsSnapshot)
  writeDB(db)
}

// Restore state from snapshot
export function restoreHistory(id) {
  const entry = (db.history || []).find((h) => h.id === id)
  if (!entry) throw new Error('State not found')
  if (!entry.snapshot) throw new Error('No snapshot available for this state')
  
  const currentKeywordsSnapshot = JSON.parse(JSON.stringify(db.keywords))
  db.keywords = entry.snapshot
  
  addHistory('update', `Restored state: "${entry.title}"`, entry.tag, currentKeywordsSnapshot)
  writeDB(db)
}

// Get Shard Loads for Balancer
export function getShardLoads() {
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

// Assign Shard (Search Data Balancer)
export function assignShard() {
  const loads = getShardLoads()
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

// Quick Reference Finder (BFS Shortest Path)
export function findShortestPath(source, target) {
  const links = db.citations && db.citations.links ? db.citations.links : []
  const adj = {}
  links.forEach((l) => {
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
  return pathFound
}

// Helper to get flat documents array
export function getAllDocs() {
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
            shard: d.shard || null,
            file: d.file || null,
            content: d.content || null
          })
        })
      }
    })
  }
  return docs
}

// Background Indexer Step
export function runBackgroundIndexerStep() {
  let changed = false
  
  // Find first PENDING document
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
    // Find first INDEXING document
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
      indexingDoc.shard = assignShard()
      changed = true
      console.log(`Background Indexer: Completed indexing document "${indexingDoc.title}". Assigned to Shard ${indexingDoc.shard}`)
    }
  }
  
  if (changed) {
    writeDB(db)
  }
}
