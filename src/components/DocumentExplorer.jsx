import React, { useEffect, useState } from 'react'

export default function DocumentExplorer() {
  const [docs, setDocs] = useState([])
  const [indexerStatus, setIndexerStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
    // Poll indexer and docs status every 3 seconds to show real-time changes
    const interval = setInterval(() => {
      load()
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  function load() {
    // Fetch indexer stats
    fetch('/api/indexer/status')
      .then((r) => r.json())
      .then((data) => setIndexerStatus(data))
      .catch(() => setIndexerStatus(null))

    // Fetch citations which returns full doc list with detailed shard info
    fetch('/api/citations')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.docs)) {
          setDocs(data.docs)
        }
        setLoading(false)
      })
      .catch(() => {
        setDocs([])
        setLoading(false)
      })
  }

  const getStatusBadge = (status) => {
    if (status === 'INDEXED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          INDEXED
        </span>
      )
    }
    if (status === 'INDEXING') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
          INDEXING
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
        PENDING QUEUE
      </span>
    )
  }

  const getShardColor = (shard) => {
    if (shard === 'Alpha') return 'text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-950/30 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-900/40'
    if (shard === 'Beta') return 'text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-50 dark:bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-900/40'
    if (shard === 'Gamma') return 'text-fuchsia-600 dark:text-fuchsia-400 font-bold bg-fuchsia-50 dark:bg-fuchsia-950/30 px-2 py-0.5 rounded border border-fuchsia-200 dark:border-fuchsia-900/40'
    return 'text-on-surface-variant italic'
  }

  return (
    <div className="space-y-6">
      {/* Balancer Stats Cards */}
      {indexerStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl space-y-2 flex flex-col justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Total Nodes in Index</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-on-surface">{indexerStatus.total}</span>
              <span className="text-xs text-on-surface-variant">documents</span>
            </div>
            <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-2">
              <div className="bg-primary h-full w-full"></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl space-y-2 flex flex-col justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Successfully Indexed</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{indexerStatus.indexed}</span>
              <span className="text-xs text-on-surface-variant">of {indexerStatus.total}</span>
            </div>
            <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500" 
                style={{ width: `${indexerStatus.total > 0 ? (indexerStatus.indexed / indexerStatus.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl space-y-2 flex flex-col justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Queue Backlog</p>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${indexerStatus.pending > 0 ? 'text-amber-500 animate-pulse' : 'text-on-surface'}`}>
                {indexerStatus.pending}
              </span>
              <span className="text-xs text-on-surface-variant">pending / {indexerStatus.indexing} indexing</span>
            </div>
            <div className="w-full bg-surface-container h-1 rounded-full overflow-hidden mt-2">
              <div 
                className="bg-amber-500 h-full transition-all duration-500" 
                style={{ width: `${indexerStatus.total > 0 ? ((indexerStatus.pending + indexerStatus.indexing) / indexerStatus.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-surface-container-lowest border border-outline-variant p-5 rounded-xl space-y-2 flex flex-col justify-between">
            <p className="text-xs uppercase tracking-wider text-on-surface-variant font-bold">Data Balancer Efficiency</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-primary">Balanced</span>
            </div>
            <div className="text-xs text-on-surface-variant">Even distribution constraint active</div>
          </div>
        </div>
      )}

      {/* Shards Load Balancing Dashboard */}
      {indexerStatus && (
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined">dns</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-headline-sm">Search Data Balancer</h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant">Visual distribution of index data across storage servers.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            {indexerStatus.shards.map((shard) => {
              const shardColorClass = shard.name.includes('Alpha') ? 'bg-violet-500' : shard.name.includes('Beta') ? 'bg-cyan-500' : 'bg-fuchsia-500';
              return (
                <div key={shard.name} className="p-4 bg-surface-container-low rounded-lg border border-outline-variant space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-sm">{shard.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-surface border border-outline-variant font-mono">{shard.count} docs</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>Server Capacity Allocation</span>
                      <span>{shard.percent}%</span>
                    </div>
                    <div className="w-full bg-surface h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${shardColorClass} transition-all duration-500`}
                        style={{ width: `${shard.percent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Documents Table */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low flex justify-between items-center">
          <h3 className="font-bold text-sm uppercase tracking-wider">Document Cluster Repository</h3>
          <span className="text-xs text-on-surface-variant">{docs.length} documents registered</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
            <p className="text-sm">Fetching document records...</p>
          </div>
        ) : docs.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant flex flex-col items-center gap-2">
            <span className="material-symbols-outlined text-4xl">description</span>
            <p className="text-sm">No documents found. Create a cluster with documents first.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface text-on-surface-variant font-bold text-xs uppercase">
                  <th className="p-4">Document Title</th>
                  <th className="p-4">Keywords Tag Folder</th>
                  <th className="p-4">Source Reference</th>
                  <th className="p-4">Indexer Status</th>
                  <th className="p-4">Server Shard</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {docs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="p-4 font-medium">{doc.title}</td>
                    <td className="p-4">
                      <span className="inline-block px-2 py-0.5 bg-surface border border-outline-variant rounded text-xs font-semibold">
                        {doc.clusterTitle}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-mono text-on-surface-variant max-w-[200px] truncate" title={doc.source}>
                      {doc.source}
                    </td>
                    <td className="p-4">{getStatusBadge(doc.indexingStatus)}</td>
                    <td className="p-4">
                      <span className={getShardColor(doc.shard)}>
                        {doc.shard ? `Shard ${doc.shard}` : 'Not assigned'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        className="px-2.5 py-1 text-xs border border-outline-variant rounded bg-surface hover:bg-surface-container transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent('open-doc', { detail: doc }))}
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
