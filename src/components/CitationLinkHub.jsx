import React, { useEffect, useState } from 'react'
import { getDB, addCitationLink, deleteCitationLink, findShortestPath, getAllDocs, subscribe } from '../utils/db'

export default function CitationLinkHub({ inlineView = true, setActiveTab }) {
  const [links, setLinks] = useState([])
  const [docs, setDocs] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)
  
  // Link creation form state
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')

  // Shortest path finder state
  const [startId, setStartId] = useState('')
  const [endId, setEndId] = useState('')
  const [shortestPath, setShortestPath] = useState(null)
  const [pathSearched, setPathSearched] = useState(false)

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
    try {
      const dbInstance = getDB()
      setLinks(dbInstance.citations?.links || [])
      setDocs(getAllDocs())
    } catch (e) {
      console.error('Citations load error:', e)
    }
  }

  const toast = (message, type = 'success') => {
    window.dispatchEvent(new CustomEvent('show-toast', { detail: { message, type } }))
  }

  const confirmAction = (message, onConfirm) => {
    window.dispatchEvent(new CustomEvent('show-confirm', { detail: { message, onConfirm } }))
  }

  function handleAddLink(e) {
    e.preventDefault()
    if (!sourceId || !targetId) return toast('Select both source and target documents', 'error')
    if (sourceId === targetId) return toast('A document cannot reference itself', 'error')

    try {
      addCitationLink(sourceId, targetId)
      setSourceId('')
      setTargetId('')
      toast('Citation reference link added successfully!')
      load()
    } catch (err) {
      toast('Failed to add link: ' + err.message, 'error')
    }
  }

  function handleDeleteLink(src, tgt) {
    confirmAction('Delete this citation reference link?', () => {
      try {
        deleteCitationLink(src, tgt)
        if (shortestPath && (shortestPath.includes(src) && shortestPath.includes(tgt))) {
          setShortestPath(null)
          setPathSearched(false)
        }
        toast('Citation link deleted successfully!')
        load()
      } catch (err) {
        toast('Failed to delete link: ' + err.message, 'error')
      }
    })
  }

  function handleFindShortestPath(e) {
    e.preventDefault()
    if (!startId || !endId) return toast('Select start and target papers', 'error')
    if (startId === endId) {
      setShortestPath([startId])
      setPathSearched(true)
      return
    }

    try {
      const path = findShortestPath(startId, endId)
      setShortestPath(path)
      setPathSearched(true)
    } catch (err) {
      console.error('Error finding shortest path:', err)
    }
  }

  // Layout positions calculator
  const width = inlineView ? 400 : 700
  const height = inlineView ? 300 : 400
  const cx = width / 2
  const cy = height / 2
  const r = inlineView ? 100 : 130

  // Place nodes uniformly in a circle
  const nodePositions = {}
  docs.forEach((doc, idx) => {
    const angle = (2 * Math.PI * idx) / docs.length
    nodePositions[doc.id] = {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      doc: doc
    }
  })

  // Selected document info helpers
  const selectedDocObj = selectedNode ? docs.find(d => d.id === selectedNode) : null
  const outboundCitations = selectedNode ? links.filter(l => l.source === selectedNode) : []
  const inboundCitations = selectedNode ? links.filter(l => l.target === selectedNode) : []

  // Check if a link is part of the shortest path
  const isLinkInShortestPath = (src, tgt) => {
    if (!shortestPath) return false
    for (let i = 0; i < shortestPath.length - 1; i++) {
      if (shortestPath[i] === src && shortestPath[i+1] === tgt) return true
    }
    return false
  }

  if (inlineView) {
    return (
      <div className="col-span-12 md:col-span-5 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="font-headline-sm text-headline-sm">Citation Link Hub</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Mapping cross-document dependencies.</p>
          </div>
          <button 
            onClick={() => setActiveTab && setActiveTab('citations')}
            className="px-3 py-1 text-xs border border-primary text-primary rounded hover:bg-primary/5 transition-all font-semibold"
          >
            Open Workspace
          </button>
        </div>

        {/* Dynamic SVG graph preview */}
        <div className="flex-1 min-h-[200px] border border-outline-variant rounded bg-surface relative overflow-hidden flex items-center justify-center">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
              <p className="font-label-sm text-label-sm">Graph Loading...</p>
            </div>
          ) : (
            <svg width="100%" height="250" viewBox={`0 0 ${width} ${height}`} className="select-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#b0b5b0" />
                </marker>
              </defs>

              {/* Draw connections */}
              {links.map((link, i) => {
                const srcPos = nodePositions[link.source]
                const tgtPos = nodePositions[link.target]
                if (!srcPos || !tgtPos) return null
                return (
                  <line
                    key={`link-${i}`}
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke="#d2d7d2"
                    strokeWidth="1.5"
                    markerEnd="url(#arrow)"
                  />
                )
              })}

              {/* Draw document nodes */}
              {Object.entries(nodePositions).map(([id, pos]) => (
                <g key={`node-${id}`} className="cursor-pointer" onClick={() => setActiveTab && setActiveTab('citations')}>
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="13"
                    fill="var(--md-sys-color-surface-container-high, #e0e3e5)"
                    stroke="var(--md-sys-color-outline-variant, #b0b5b0)"
                    strokeWidth="1.5"
                    className="hover:fill-primary/20 hover:stroke-primary transition-all"
                  />
                  <text
                    x={pos.x}
                    y={pos.y + 4}
                    textAnchor="middle"
                    className="fill-on-surface font-black select-none pointer-events-none"
                    style={{ fontSize: '9px' }}
                  >
                    {pos.doc.title.substring(0, 2).toUpperCase()}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>

        <div className="flex justify-between items-center px-2">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-800">C</div>
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-cyan-100 flex items-center justify-center text-xs font-bold text-cyan-800">I</div>
            <div className="w-8 h-8 rounded-full border-2 border-surface bg-fuchsia-100 flex items-center justify-center text-xs font-bold text-fuchsia-800">T</div>
          </div>
          <span className="font-label-sm text-label-sm text-primary font-bold">
            {links.length} Active Citation Links Found
          </span>
        </div>
      </div>
    )
  }

  // Full screen Workspace
  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Graph Visualizer Panel */}
      <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-center border-b border-outline-variant pb-3">
          <h3 className="font-bold text-sm uppercase tracking-wider">Reference Dependency Network</h3>
          <span className="text-xs text-on-surface-variant italic">Click nodes to inspect bibliography</span>
        </div>

        <div className="flex-1 min-h-[400px] border border-outline-variant rounded bg-surface relative overflow-hidden flex items-center justify-center">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 opacity-40">
              <span className="material-symbols-outlined text-4xl animate-spin">sync</span>
              <p className="font-label-sm text-label-sm">Constructing Map...</p>
            </div>
          ) : (
            <svg width="100%" height="400" viewBox={`0 0 ${width} ${height}`} className="select-none">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#b0b5b0" />
                </marker>
                <marker id="arrow-selected" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#005FAF" />
                </marker>
                <marker id="arrow-path" viewBox="0 0 10 10" refX="24" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#f97316" />
                </marker>
              </defs>

              {/* Draw links */}
              {links.map((link, i) => {
                const srcPos = nodePositions[link.source]
                const tgtPos = nodePositions[link.target]
                if (!srcPos || !tgtPos) return null
                
                const isSelected = selectedNode === link.source || selectedNode === link.target
                const isPath = isLinkInShortestPath(link.source, link.target)

                let color = '#d2d7d2'
                let widthVal = 1.5
                let marker = 'url(#arrow)'

                if (isSelected) {
                  color = '#005FAF'
                  widthVal = 2
                  marker = 'url(#arrow-selected)'
                }
                if (isPath) {
                  color = '#f97316'
                  widthVal = 3.5
                  marker = 'url(#arrow-path)'
                }

                return (
                  <line
                    key={`link-${i}`}
                    x1={srcPos.x}
                    y1={srcPos.y}
                    x2={tgtPos.x}
                    y2={tgtPos.y}
                    stroke={color}
                    strokeWidth={widthVal}
                    markerEnd={marker}
                    className="transition-all duration-300"
                  />
                )
              })}

              {/* Draw nodes */}
              {Object.entries(nodePositions).map(([id, pos]) => {
                const isSelected = selectedNode === id
                const isInPath = shortestPath && shortestPath.includes(id)
                
                let fill = 'var(--md-sys-color-surface-container-high, #e0e3e5)'
                let stroke = 'var(--md-sys-color-outline-variant, #b0b5b0)'
                let strokeW = 1.5
                let radius = 16

                if (isSelected) {
                  fill = '#005FAF'
                  stroke = '#ffffff'
                  strokeW = 3
                  radius = 18
                } else if (isInPath) {
                  fill = '#ffedd5'
                  stroke = '#f97316'
                  strokeW = 3
                  radius = 18
                }

                return (
                  <g key={`node-${id}`} className="cursor-pointer" onClick={() => { setSelectedNode(id); setShortestPath(null); setPathSearched(false) }}>
                    <circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={strokeW}
                      className="hover:opacity-90 transition-all duration-300"
                    />
                    <text
                      cx={pos.x}
                      cy={pos.y}
                      x={pos.x}
                      y={pos.y + 4}
                      textAnchor="middle"
                      className={`font-black select-none pointer-events-none ${isSelected ? 'fill-white' : 'fill-on-surface'}`}
                      style={{ fontSize: '10px' }}
                    >
                      {pos.doc.title.substring(0, 2).toUpperCase()}
                    </text>
                    <title>{pos.doc.title}</title>
                  </g>
                )
              })}
            </svg>
          )}
        </div>
      </div>

      {/* Control Panel (Right Side) */}
      <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
        
        {/* Feature 7: Quick Reference Finder */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-orange-500 font-bold">route</span>
            <h4 className="font-bold text-sm uppercase tracking-wider text-orange-500">Quick Reference Finder</h4>
          </div>
          <p className="text-xs text-on-surface-variant">Find the shortest path of cited research papers to connect related articles.</p>
          
          <form onSubmit={handleFindShortestPath} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Start Paper</label>
                <select 
                  value={startId} 
                  onChange={(e) => setStartId(e.target.value)} 
                  className="w-full text-xs p-2 border rounded bg-surface border-outline-variant text-on-surface"
                >
                  <option value="">Select paper...</option>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Target Paper</label>
                <select 
                  value={endId} 
                  onChange={(e) => setEndId(e.target.value)} 
                  className="w-full text-xs p-2 border rounded bg-surface border-outline-variant text-on-surface"
                >
                  <option value="">Select paper...</option>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="w-full py-2 text-xs font-bold uppercase rounded bg-orange-500 text-white hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              Find Shortest Path
            </button>
          </form>

          {pathSearched && (
            <div className="p-3 bg-surface-container-low border border-outline-variant rounded space-y-2">
              <h5 className="text-xs font-bold text-on-surface">Search Results:</h5>
              {shortestPath ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {shortestPath.map((nodeId, idx) => {
                      const dObj = docs.find(d => d.id === nodeId)
                      return (
                        <React.Fragment key={nodeId}>
                          <span 
                            className="px-2 py-1 bg-orange-100 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-900/40 rounded cursor-pointer hover:bg-orange-200"
                            onClick={() => setSelectedNode(nodeId)}
                          >
                            {dObj ? dObj.title : nodeId}
                          </span>
                          {idx < shortestPath.length - 1 && (
                            <span className="material-symbols-outlined text-xs text-orange-500 font-black">arrow_right_alt</span>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                  <p className="text-[10px] text-on-surface-variant font-medium">Path found! Highlighted in orange on network graph.</p>
                </div>
              ) : (
                <div className="text-xs text-red-600 dark:text-red-400 font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">error</span>
                  No citation path connects the selected papers.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Link Form */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-primary font-bold">add_link</span>
            <h4 className="font-bold text-sm uppercase tracking-wider text-primary">Add Citation Reference</h4>
          </div>
          
          <form onSubmit={handleAddLink} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Source (Cites)</label>
                <select 
                  value={sourceId} 
                  onChange={(e) => setSourceId(e.target.value)} 
                  className="w-full text-xs p-2 border rounded bg-surface border-outline-variant text-on-surface"
                >
                  <option value="">Select document...</option>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase">Target (Cited By)</label>
                <select 
                  value={targetId} 
                  onChange={(e) => setTargetId(e.target.value)} 
                  className="w-full text-xs p-2 border rounded bg-surface border-outline-variant text-on-surface"
                >
                  <option value="">Select document...</option>
                  {docs.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
                </select>
              </div>
            </div>
            <button 
              type="submit" 
              className="w-full py-2 text-xs font-bold uppercase rounded bg-primary text-white hover:bg-primary/95 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              Register Citation Link
            </button>
          </form>
        </div>

        {/* Selected Node Details Inspector */}
        <div className="bg-surface-container-lowest border border-outline-variant p-6 rounded-xl space-y-4 flex-1 shadow-sm">
          <div className="flex items-center gap-2 border-b border-outline-variant pb-2">
            <span className="material-symbols-outlined text-on-surface-variant">info</span>
            <h4 className="font-bold text-sm uppercase tracking-wider text-on-surface-variant">Document Inspector</h4>
          </div>
          
          {selectedDocObj ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase">Document Title</p>
                <p className="font-bold text-sm text-on-surface">{selectedDocObj.title}</p>
                <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">ID: {selectedDocObj.id}</p>
                <p className="text-[11px] font-bold text-primary mt-1">Cluster: {selectedDocObj.clusterTitle}</p>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant font-bold uppercase">References Outgoing ({outboundCitations.length})</p>
                {outboundCitations.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">This document cites no other papers.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {outboundCitations.map(l => {
                      const targetDoc = docs.find(d => d.id === l.target)
                      return (
                        <div key={`${l.source}-${l.target}`} className="flex justify-between items-center p-2 bg-surface border border-outline-variant rounded text-xs">
                          <span className="truncate flex-1" title={targetDoc?.title}>{targetDoc ? targetDoc.title : l.target}</span>
                          <button 
                            onClick={() => handleDeleteLink(l.source, l.target)}
                            className="ml-2 text-[10px] uppercase font-bold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant font-bold uppercase">Referenced By Incoming ({inboundCitations.length})</p>
                {inboundCitations.length === 0 ? (
                  <p className="text-xs text-on-surface-variant italic">This document is not cited by other papers.</p>
                ) : (
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {inboundCitations.map(l => {
                      const sourceDoc = docs.find(d => d.id === l.source)
                      return (
                        <div key={`${l.source}-${l.target}`} className="flex justify-between items-center p-2 bg-surface border border-outline-variant rounded text-xs">
                          <span className="truncate flex-1" title={sourceDoc?.title}>{sourceDoc ? sourceDoc.title : l.source}</span>
                          <button 
                            onClick={() => handleDeleteLink(l.source, l.target)}
                            className="ml-2 text-[10px] uppercase font-bold text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-on-surface-variant text-xs italic">
              Click on a document node in the network graph to inspect its citation connections.
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
