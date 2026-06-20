import React, { useEffect, useState } from 'react'
import { Sidebar, TopNav, Header, KeywordOrganizer, SecurityChecker, CitationLinkHub, RelevanceSorter, SearchHistory, Footer, DocumentExplorer } from './components'
import { runBackgroundIndexerStep } from './utils/db'
import './index.css'

export default function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('search')
  const [toast, setToast] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    function handleShowToast(e) {
      setToast(e.detail)
    }
    function handleShowConfirm(e) {
      setConfirmDialog(e.detail)
    }
    window.addEventListener('show-toast', handleShowToast)
    window.addEventListener('show-confirm', handleShowConfirm)
    return () => {
      window.removeEventListener('show-toast', handleShowToast)
      window.removeEventListener('show-confirm', handleShowConfirm)
    }
  }, [])

  useEffect(() => {
    // Run the background indexer step every 4 seconds (purely client-side)
    const interval = setInterval(() => {
      runBackgroundIndexerStep()
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  return (
    <div className="flex bg-surface min-h-screen text-on-surface">
      {/* Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content */}
      <div className="md:ml-[280px] min-h-screen w-full relative pb-16">
        {/* Top Navigation */}
        <TopNav value={searchQuery} onSearch={setSearchQuery} />
        
        {/* Page Content */}
        <div className="max-w-[1400px] mx-auto space-y-gutter custom-scrollbar p-6">
          
          {activeTab === 'search' && (
            <>
              {/* Hero Section */}
              <Header setActiveTab={setActiveTab} />
              
              {/* Feature Bento Grid */}
              <div className="bento-grid">
                {/* Keyword Organizer */}
                <KeywordOrganizer search={searchQuery} />
                
                {/* Security Checker */}
                <SecurityChecker />
                
                {/* Citation Link Hub */}
                <CitationLinkHub inlineView={true} setActiveTab={setActiveTab} />
                
                {/* Relevance Sorter */}
                <RelevanceSorter search={searchQuery} />
              </div>
              
              {/* Search History */}
              <SearchHistory />
            </>
          )}

          {activeTab === 'keywords' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">Keyword Organizer</h2>
                  <p className="text-on-surface-variant mt-1">Autonomous folder structuring based on semantic clustering.</p>
                </div>
              </div>
              <div className="bento-grid">
                <KeywordOrganizer search={searchQuery} />
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Documents & Shard Balancer</h2>
                <p className="text-on-surface-variant mt-1">Index tracking, background queue status and cloud balancer nodes.</p>
              </div>
              <DocumentExplorer />
            </div>
          )}

          {activeTab === 'citations' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Citation Link Hub</h2>
                <p className="text-on-surface-variant mt-1">Full network graph mapping and Quick Reference Finder path routing.</p>
              </div>
              <CitationLinkHub inlineView={false} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Security Checkroom</h2>
                <p className="text-on-surface-variant mt-1">Verify file integrity using MD5 checksum validation.</p>
              </div>
              <div className="max-w-3xl">
                <SecurityChecker />
              </div>
            </div>
          )}
          
        </div>
        
        {/* Footer */}
        <Footer />
      </div>

      {/* Custom Toast Notification */}
      {toast && (
        <div className="fixed bottom-16 right-6 z-70 max-w-sm bg-surface-container-high border border-outline-variant p-4 rounded-lg shadow-lg flex items-center gap-3 animate-fade-in animate-slide-in">
          <span className={`material-symbols-outlined ${toast.type === 'error' ? 'text-red-500' : 'text-primary'}`}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <div className="flex-1">
            <p className="text-xs font-bold text-on-surface">{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-on-surface-variant hover:text-on-surface text-sm">✕</button>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-surface-container-lowest border border-outline-variant rounded-lg w-full max-w-sm p-6 space-y-4 shadow-xl">
            <h4 className="text-sm font-black text-on-surface uppercase tracking-wider">Confirmation Required</h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => { confirmDialog.onCancel && confirmDialog.onCancel(); setConfirmDialog(null) }}
                className="px-3 py-1.5 border border-outline-variant rounded text-xs hover:bg-surface-container transition-colors font-bold"
              >
                Cancel
              </button>
              <button 
                onClick={() => { confirmDialog.onConfirm && confirmDialog.onConfirm(); setConfirmDialog(null) }}
                className="px-3 py-1.5 bg-primary text-white rounded text-xs hover:opacity-90 transition-opacity font-bold"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

