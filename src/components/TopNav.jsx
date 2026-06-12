import React from 'react'

export default function TopNav({ value = '', onSearch = () => {} }) {
  return (
    <header className="flex justify-between items-center px-margin-desktop w-full h-16 sticky top-0 z-50 bg-surface border-b border-outline-variant">
      <div className="flex items-center gap-8 flex-1">
        <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">ElasticGaze Slate</h2>
        <div className="max-w-md w-full relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
            search
          </span>
          <input
            value={value}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-10 pr-12 py-2 bg-surface-container-low border border-outline-variant rounded focus:border-primary focus:ring-0 font-body-md text-body-md transition-all"
            placeholder="Search documentation, metadata, or keywords..."
            type="text"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 font-label-sm text-label-sm text-outline-variant">⌘K</span>
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <img
            alt="User Profile"
            className="w-8 h-8 rounded-full border border-outline-variant"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDPbGLhW_u7aJadvQc3f5JIWZsAzhPdwy1OI8RgHKF64bGC1XYJuLzV0WUxftohKlHomMBiiqNNyFizqzYEUyENHrsoRlbq6JHoBgYSi4FVplUL7R5_pUDQsl8r2jMV0s2y4CGz9PH1L_E-UHB9tAuZz_grLxlOPm80k6uC5UH4DKpSTjDjnskKScjWNCJVQxRFcZgp-SKVH0MDu9PLabYVLbjUP-vi0zCWf9lVSwp0FVpxkas551NjrL-26iY7HF2mdZX7HbwKR5oK"
          />
          <div className="hidden lg:block text-right">
            <p className="font-label-md text-label-md text-on-surface">Arthur Sterling</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Senior Analyst</p>
          </div>
        </div>
      </div>
    </header>
  )
}
