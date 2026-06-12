import React, { useEffect, useState } from 'react'

export default function Footer() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    load()
    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [])

  function load() {
    fetch('/api/indexer/status')
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => setStats(null))
  }

  const hasBacklog = stats && (stats.pending > 0 || stats.indexing > 0)
  const percentIndexed = stats && stats.total > 0 ? Math.round((stats.indexed / stats.total) * 100) : 100

  return (
    <footer className="sticky bottom-0 w-full bg-surface/90 backdrop-blur-md border-t border-outline-variant px-6 py-3 flex justify-between items-center z-50 shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.2)]">
      <div className="flex items-center gap-6">
        {/* Background Indexer Status */}
        <div className="flex items-center gap-3">
          <div className="relative w-2.5 h-2.5">
            {hasBacklog ? (
              <>
                <div className="absolute inset-0 bg-amber-500 rounded-full animate-ping"></div>
                <div className="absolute inset-0 bg-amber-500 rounded-full"></div>
              </>
            ) : (
              <>
                <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-60"></div>
                <div className="absolute inset-0 bg-emerald-500 rounded-full"></div>
              </>
            )}
          </div>
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Background Indexer:{' '}
            <span className="text-on-surface font-black">
              {stats 
                ? hasBacklog 
                  ? `Indexing Backlog (${stats.pending} pending / ${stats.indexing} processing)` 
                  : `Idle (All ${stats.indexed} nodes indexed)`
                : 'Connecting...'}
            </span>
          </span>
        </div>

        {/* Data Balancer Status */}
        <div className="flex items-center gap-4 border-l border-outline-variant pl-6">
          <span className="font-label-sm text-label-sm text-on-surface-variant">
            Data Balancer:{' '}
            <span className="text-on-surface font-black">
              {percentIndexed}% Distributed
            </span>
          </span>
          <div className="w-24 bg-surface-container-high h-1.5 rounded-full overflow-hidden border border-outline-variant/30">
            <div 
              className={`h-full transition-all duration-500 ${percentIndexed === 100 ? 'bg-primary' : 'bg-amber-500'}`}
              style={{ width: `${percentIndexed}%` }}
            ></div>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant font-medium">
          <span className="material-symbols-outlined text-[14px]">cloud_sync</span>
          Syncing with 3 Shard Nodes
        </div>
        <div className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1 font-medium">
          <span className="material-symbols-outlined text-[14px]">lock</span>
          E2EE AES-256
        </div>
      </div>
    </footer>
  )
}
