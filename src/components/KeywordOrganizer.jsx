import React, { useEffect, useState } from 'react'
import KeywordCard from './KeywordCard'
import CreateClusterModal from './CreateClusterModal'
import ClusterViewer from './ClusterViewer'
import DocumentViewer from './DocumentViewer'

export default function KeywordOrganizer({ search = '' }) {
  const [keywords, setKeywords] = useState([])
  const [creating, setCreating] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCount, setNewCount] = useState('')
  const [newDocs, setNewDocs] = useState([{ title: '', snippet: '', source: '' }])
  const [viewerOpen, setViewerOpen] = useState(false)
  const [activeCluster, setActiveCluster] = useState(null)

  useEffect(() => {
    load()
    window.addEventListener('reload-data', load)
    
    const openModal = () => setCreateModalOpen(true)
    window.addEventListener('open-create-cluster', openModal)
    
    return () => {
      window.removeEventListener('reload-data', load)
      window.removeEventListener('open-create-cluster', openModal)
    }
  }, [])

  function load() {
    fetch('/api/keywords')
      .then((r) => r.json())
      .then((data) => setKeywords(data))
      .catch(() => setKeywords([]))
  }

  function handleDelete(id) {
    window.dispatchEvent(new CustomEvent('show-confirm', {
      detail: {
        message: 'Are you sure you want to delete this keyword folder cluster?',
        onConfirm: () => {
          fetch(`/api/keywords/${id}`, { method: 'DELETE' })
            .then((r) => r.json())
            .then(() => {
              window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Keyword cluster deleted successfully!' } }))
              load()
            })
            .catch((err) => {
              window.dispatchEvent(new CustomEvent('show-toast', { detail: { message: 'Delete failed: ' + err.message, type: 'error' } }))
            })
        }
      }
    }))
  }

  return (
    <div className="col-span-12 md:col-span-8 bg-surface-container-lowest border border-outline-variant p-6 rounded-xl flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-headline-sm text-headline-sm text-on-surface">Keyword Organizer</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">Autonomous folder structuring based on semantic clustering.</p>
        </div>
        <button className="p-2 hover:bg-surface-container rounded transition-colors text-on-surface-variant">
          <span className="material-symbols-outlined">filter_list</span>
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {keywords
          .filter((k) => k.title.toLowerCase().includes(String(search || '').toLowerCase()))
          .map((k) => (
            <KeywordCard
              key={k.id}
              title={k.title}
              count={k.count}
              docs={k.docs || []}
              onDelete={() => handleDelete(k.id)}
              onOpen={() => { setActiveCluster(k); setViewerOpen(true) }}
            />
          ))}
        {/* Create Cluster Card or Form */}
        {!createModalOpen ? (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="p-4 text-left bg-surface-container-low border border-outline-variant rounded flex flex-col gap-2 group hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-on-surface-variant">add_box</span>
            <p className="font-label-md text-label-md">Create Cluster</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">New Tag</p>
          </button>
        ) : null}
      </div>
      <CreateClusterModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onCreate={async (payload) => {
        // POST to backend
        await fetch('/api/keywords', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        load()
      }} />
      <ClusterViewer open={viewerOpen} onClose={() => setViewerOpen(false)} cluster={activeCluster} />
      <DocumentViewer />
    </div>
  )
}
