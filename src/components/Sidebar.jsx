import React from 'react'

export default function Sidebar({ activeTab, setActiveTab }) {
  const active = activeTab || 'search'
  const setActive = setActiveTab || (() => {})

  const menuItems = [
    { id: 'search', label: 'Search', icon: 'search' },
    { id: 'keywords', label: 'Keywords', icon: 'key' },
    { id: 'documents', label: 'Documents', icon: 'description' },
    { id: 'citations', label: 'Citations', icon: 'format_quote' },
    { id: 'security', label: 'Security', icon: 'verified_user' },
  ]

  return (
    <aside className="hidden md:flex flex-col h-screen w-[280px] fixed left-0 top-0 bg-surface border-r border-outline-variant py-density-comfortable duration-200 ease-in-out z-40">
      {/* Logo Section */}
      <div className="px-6 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary flex items-center justify-center rounded">
            <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: "'FILL' 1" }}>
              analytics
            </span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-black text-on-surface">Slate Intelligence</h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-widest">Document Analysis</p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <a
            key={item.id}
            href="#"
            onClick={() => setActive(item.id)}
            className={`flex items-center gap-3 px-4 py-3 text-label-md font-label-md border-l-2 transition-all rounded-none ${
              active === item.id
                ? 'border-primary text-primary bg-surface-container-low'
                : 'border-transparent text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

    </aside>
  )
}
