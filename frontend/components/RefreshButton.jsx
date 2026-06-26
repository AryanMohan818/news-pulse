'use client';
import { useState } from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';
import { triggerIngestion, getJobStatus } from '../lib/api';

export default function RefreshButton({ onRefreshComplete }) {
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    async function handleTriggerRefresh() {
        setLoading(true);
        setStatusMsg('Spawning Python AI Pipeline...');
        
        try {
            const { jobId } = await triggerIngestion();
            
            // Poll SQLite job tracking record
            const pollTimer = setInterval(async () => {
                try {
                    const job = await getJobStatus(jobId);
                    
                    if (job.status === 'completed') {
                        clearInterval(pollTimer);
                        setStatusMsg(`✅ Clustered ${job.clusters_formed} topics!`);
                        onRefreshComplete(); // Reload main dashboard data
                        
                        setTimeout(() => {
                            setLoading(false);
                            setStatusMsg('');
                        }, 2500);
                    } else if (job.status === 'failed') {
                        clearInterval(pollTimer);
                        setStatusMsg('❌ Scraping Job Failed.');
                        setLoading(false);
                    } else {
                        setStatusMsg(`⚡ Scraping live RSS... (${job.articles_fetched || 0} items)`);
                    }
                } catch (err) {
                    clearInterval(pollTimer);
                    setLoading(false);
                }
            }, 2000);
            
        } catch (err) {
            setStatusMsg('⚠️ Server Unreachable');
            setLoading(false);
        }
    }

    return (
        <button 
            onClick={handleTriggerRefresh} 
            disabled={loading}
            className={`action-button ${loading ? 'running' : ''}`}
        >
            {loading ? (
                <RefreshCw size={18} className="spin-anim text-cyan-300" />
            ) : (
                <Sparkles size={18} className="text-amber-400" />
            )}
            <span>{loading ? statusMsg : 'Trigger Live AI Scrape'}</span>
        </button>
    );
}