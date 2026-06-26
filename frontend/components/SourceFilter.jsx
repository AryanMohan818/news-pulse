'use client';
import { Globe } from 'lucide-react';

const SOURCES = ['all', 'BBC News', 'NPR News', 'Al Jazeera'];

export default function SourceFilter({ activeSource, onSelectSource }) {
    return (
        <div className="filter-card">
            <div className="filter-header">
                <Globe size={18} className="text-cyan-400" />
                <span>Filter by News Organization:</span>
            </div>
            
            <div className="filter-group">
                {SOURCES.map((source) => (
                    <button
                        key={source}
                        onClick={() => onSelectSource(source)}
                        className={`source-pill ${activeSource === source ? 'active' : ''}`}
                    >
                        {source === 'all' ? '🌐 All Channels' : source}
                    </button>
                ))}
            </div>
        </div>
    );
}