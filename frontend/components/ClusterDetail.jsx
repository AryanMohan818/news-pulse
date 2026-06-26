'use client';
import { X, ExternalLink, Calendar, Radio } from 'lucide-react';

export default function ClusterDetail({ cluster, onClose }) {
    if (!cluster) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
                <div className="drawer-header">
                    <div>
                        <span className="cluster-badge">AI Cluster #{cluster.id}</span>
                        <h2 className="drawer-title">{cluster.label}</h2>
                        <p className="drawer-sub">Grouped {cluster.articles?.length || 0} related stories</p>
                    </div>
                    <button onClick={onClose} className="close-btn"><X size={24} /></button>
                </div>

                <div className="article-feed">
                    {cluster.articles?.map((art) => (
                        <article key={art.id} className="article-card">
                            <div className="card-top">
                                <span className="source-tag"><Radio size={12} className="inline mr-1" />{art.source}</span>
                                <span className="date-tag">
                                    <Calendar size={12} className="inline mr-1" />
                                    {new Date(art.published_at).toLocaleDateString()}
                                </span>
                            </div>

                            <h3 className="headline">
                                <a href={art.url} target="_blank" rel="noopener noreferrer">
                                    {art.title} <ExternalLink size={15} className="inline ml-1 text-cyan-400" />
                                </a>
                            </h3>

                            <p className="summary-snippet">{art.summary?.slice(0, 180)}...</p>
                        </article>
                    ))}
                </div>
            </div>
        </div>
    );
}