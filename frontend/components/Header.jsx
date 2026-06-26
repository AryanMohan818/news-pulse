'use client';
import { Activity } from 'lucide-react';

export default function Header() {
    return (
        <header className="app-header">
            <div className="brand-container">
                <div className="logo-glow">
                    <Activity size={28} className="text-cyan-400" />
                </div>
                <div>
                    <h1 className="title-gradient">News Pulse</h1>
                    <p className="subtitle">Live Topic-Clustered AI News Timeline</p>
                </div>
            </div>
            
            <div className="live-indicator">
                <span className="pulse-dot"></span>
                <span>AI Scraper & Agglomerative Engine Active</span>
            </div>
        </header>
    );
}