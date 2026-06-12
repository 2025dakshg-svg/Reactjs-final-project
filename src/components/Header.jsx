import React from 'react'

export default function Header({ setActiveTab }) {
  return (
    <section className="relative h-[340px] w-full rounded-xl overflow-hidden group bg-primary-container">
      <img
        className="w-full h-full object-cover mix-blend-overlay opacity-50 transition-transform duration-1000 group-hover:scale-105"
        alt="Premium corporate office at dusk"
        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDHgyjESgDBD4Bh5B0v0lrZ9qEzgS4xCbGFRH3N07H51VzhxwAR6w25C1bG5VuaU9LFMhLxMnUGTDohJiXfpfk5bMkrFVVFLIQVJuWRjyVlKxA4TfDz2sjBJIO3cqzRvJ-PPxUfnMBYv_NYP9viLLzo9U9bmap4_CN779oAWLiX_G6BpDxssY9R6dHcUrG6kC5v-5sPB5C_XG2q5SxEx5-PD6tHp9PrEDgwm9L6xYEnWC5WC9DiSYHPsCRBIuZEmVDF3zkQxBMZBhf9"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-container via-primary-container/80 to-transparent flex flex-col justify-center px-12">
        <div className="max-w-2xl space-y-4">
          <span className="font-label-md text-label-md text-primary-fixed uppercase tracking-widest bg-primary/40 px-3 py-1 rounded backdrop-blur-sm border border-primary-fixed/20 inline-block w-fit">
            Executive Intelligence
          </span>
          <h2 className="font-headline-lg text-headline-lg text-white leading-tight">
            Document Intelligence for High-Stakes Discovery
          </h2>
          <p className="font-body-lg text-body-lg text-primary-fixed/80 max-w-lg">
            ElasticGaze Slate delivers surgical precision for legal discovery and corporate intelligence. Analyze millions of data points with zero-latency relevance ranking.
          </p>
          <div className="flex gap-4 pt-4">
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-create-cluster'))}
              className="px-6 py-3 bg-white text-primary font-label-md text-label-md rounded flex items-center gap-2 hover:bg-surface-container transition-colors font-bold"
            >
              <span className="material-symbols-outlined">play_arrow</span>
              Initialize Discovery
            </button>
            <button 
              onClick={() => setActiveTab && setActiveTab('documents')}
              className="px-6 py-3 border border-white/30 text-white font-label-md text-label-md rounded hover:bg-white/10 transition-colors font-bold"
            >
              View Intelligence Reports
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
