import React, { useEffect, useState } from 'react'

export default function RelevanceSorter({ search = '' }) {
  const [relevanceData, setRelevanceData] = useState(null)
  const [allDocs, setAllDocs] = useState([])
  const [loading, setLoading] = useState(false)

  // Fetch static relevance stats
  useEffect(() => {
    fetch('/api/relevance')
      .then((r) => r.json())
      .then((data) => setRelevanceData(data))
      .catch(() => setRelevanceData(null))
  }, [])

  // Fetch all documents when search query is active
  useEffect(() => {
    if (search.trim()) {
      setLoading(true)
      fetch('/api/citations')
        .then((r) => r.json())
        .then((data) => {
          if (data && Array.isArray(data.docs)) {
            setAllDocs(data.docs)
          }
          setLoading(false)
        })
        .catch(() => {
          setAllDocs([])
          setLoading(false)
        })
    } else {
      setAllDocs([])
    }
  }, [search])

  const getProgressWidth = (value) => `${Math.min(value, 100)}%`

  // Process search query ranking
  const getSearchTermOccurrences = (text, term) => {
    if (!text || !term) return 0
    const cleanText = text.toLowerCase()
    const cleanTerm = term.toLowerCase()
    // count occurrences
    let count = 0
    let pos = cleanText.indexOf(cleanTerm)
    while (pos !== -1) {
      count++
      pos = cleanText.indexOf(cleanTerm, pos + cleanTerm.length)
    }
    return count
  }

  const query = search.trim()
  const hasQuery = query.length > 0

  // Calculate scores for each document
  const scoredDocs = allDocs
    .map((doc) => {
      const titleCount = getSearchTermOccurrences(doc.title, query)
      const snippetCount = getSearchTermOccurrences(doc.snippet, query)
      const totalCount = titleCount * 3 + snippetCount // title matches weigh more
      return {
        ...doc,
        occurrences: titleCount + snippetCount,
        score: totalCount
      }
    })
    .filter((doc) => doc.score > 0)
    .sort((a, b) => b.score - a.score)

  return (
    <div className="col-span-12 md:col-span-7 bg-primary text-white p-8 rounded-xl flex flex-col justify-between min-h-[300px]">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h3 className="font-headline-md text-headline-md">Relevance Sorter</h3>
          <p className="text-primary-fixed/60 font-body-md text-body-md">
            {hasQuery 
              ? `Ranking document matches for search term "${query}"`
              : 'Ranking search results by conceptual precision and frequency density.'}
          </p>
        </div>
        <span className="material-symbols-outlined text-4xl opacity-20">sort</span>
      </div>

      {hasQuery ? (
        <div className="flex-1 mt-6 space-y-4">
          <h4 className="text-xs uppercase tracking-widest text-primary-fixed/80 font-bold">Dynamic Ranked Search Results:</h4>
          
          {loading ? (
            <p className="text-sm opacity-60">Scanning nodes...</p>
          ) : scoredDocs.length === 0 ? (
            <p className="text-sm opacity-60 italic">No conceptual precision matches found for "{query}". Try searching "contract", "test", or "logs".</p>
          ) : (
            <div className="space-y-3 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar">
              {scoredDocs.slice(0, 5).map((doc, idx) => {
                // Calculate match strength (percent)
                const strength = Math.min(doc.score * 12 + 20, 100)
                return (
                  <div key={doc.id} className="flex flex-col gap-1 p-2 bg-white/5 rounded border border-white/10">
                    <div className="flex justify-between text-xs items-center">
                      <div className="truncate flex-1 pr-2">
                        <span className="font-bold mr-2 text-[10px] bg-white/20 px-1.5 py-0.5 rounded">{idx + 1}</span>
                        <span className="font-bold">{doc.title}</span>
                        <span className="text-[10px] opacity-65 ml-2 font-mono">({doc.clusterTitle})</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-primary-fixed">{doc.occurrences} matches</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary-fixed h-full" style={{ width: `${strength}%` }}></div>
                      </div>
                      <span className="text-[9px] font-mono opacity-80">{strength}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        relevanceData && (
          <>
            <div className="mt-8 space-y-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-primary-fixed/80">
                  <span>High Precision Matches</span>
                  <span>{relevanceData.highPrecision}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-fixed h-full"
                    style={{ width: getProgressWidth(relevanceData.highPrecision) }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-primary-fixed/80">
                  <span>Fuzzy Contextual Alignment</span>
                  <span>{relevanceData.fuzzyAlignment}%</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary-fixed/50 h-full"
                    style={{ width: getProgressWidth(relevanceData.fuzzyAlignment) }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
              <div>
                <p className="text-2xl font-bold">{relevanceData.searchLatency}</p>
                <p className="text-[10px] font-bold uppercase opacity-50">Search Latency</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{relevanceData.indexedNodes}</p>
                <p className="text-[10px] font-bold uppercase opacity-50">Indexed Nodes</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{relevanceData.dataDrift}</p>
                <p className="text-[10px] font-bold uppercase opacity-50">Data Drift</p>
              </div>
            </div>
          </>
        )
      )}
    </div>
  )
}
