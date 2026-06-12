import React from 'react'

export default function KeywordCard({ title, count, onDelete, docs = [], onOpen }) {
  const first = docs && docs.length ? docs[0] : null
  return (
    <div onClick={() => onOpen && onOpen()} className="relative p-4 bg-surface-container-low border border-outline-variant rounded flex flex-col gap-2 group hover:border-primary transition-colors cursor-pointer">
      <button
        onClick={onDelete}
        className="absolute top-2 right-2 text-on-surface-variant hover:text-red-600"
        title="Delete"
      >
        <span className="material-symbols-outlined">delete</span>
      </button>
      <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
        folder
      </span>
      <p className="font-label-md text-label-md">{title}</p>
      {first ? (
        <div className="text-xs text-on-surface-variant">
          <div className="font-medium">{first.title}</div>
          <div className="truncate">{first.snippet || (first.source ? `Source: ${first.source}` : '')}</div>
          <div className="mt-1 text-[11px]">{docs.length} Docs</div>
        </div>
      ) : (
        <p className="font-label-sm text-label-sm text-on-surface-variant">{count} Docs</p>
      )}
    </div>
  )
}
