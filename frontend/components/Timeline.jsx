'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Layers, Clock, Newspaper } from 'lucide-react';

function getBarColor(sourcesStr) {
    if (!sourcesStr) return '#06b6d4'; // Default Cyan
    if (sourcesStr.includes('BBC')) return '#f87171'; // Coral Red
    if (sourcesStr.includes('NPR')) return '#60a5fa'; // Sky Blue
    if (sourcesStr.includes('Al Jazeera')) return '#fbbf24'; // Amber Gold
    return '#34d399'; // Emerald Green for multi-source overlap
}

function CustomTooltip({ active, payload }) {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="tooltip-panel">
                <h4 className="tooltip-title">{data.label}</h4>
                <div className="tooltip-meta">
                    <p><Newspaper size={14} className="text-cyan-400 inline mr-1" /> {data.article_count} Articles Grouped</p>
                    <p><Layers size={14} className="text-amber-400 inline mr-1" /> Channels: {data.sources?.replace(/,/g, ' • ')}</p>
                    <p><Clock size={14} className="text-slate-400 inline mr-1" /> Latest: {new Date(data.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <p className="click-prompt">👉 Click bar to inspect articles</p>
            </div>
        );
    }
    return null;
}

export default function Timeline({ data, onSelectCluster }) {
    if (!data || data.length === 0) {
        return (
            <div className="empty-state">
                <p>📭 No topic clusters match the selected filter.</p>
            </div>
        );
    }

    // Dynamic height calculation so bars never squish together if there are 50 breaking stories
    const chartHeight = Math.max(450, data.length * 52);

    return (
        <div className="timeline-container">
            <div className="chart-header">
                <h3>📈 Semantic News Volume Timeline</h3>
                <span>Bar length = Article count | Click bar to view stories</span>
            </div>

            <div style={{ width: '100%', height: chartHeight }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                        data={data} 
                        layout="vertical"
                        margin={{ top: 10, right: 30, left: 220, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={true} vertical={false} />
                        <XAxis type="number" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                        <YAxis 
                            dataKey="label" 
                            type="category" 
                            stroke="#cbd5e1" 
                            width={210}
                            tick={{ fontSize: 13, fill: '#f1f5f9', fontWeight: 500 }}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(6, 182, 212, 0.08)' }} />
                        
                        <Bar dataKey="article_count" radius={[0, 6, 6, 0]}>
                            {data.map((entry, index) => (
                                <Cell 
                                    key={`cell-${index}`} 
                                    fill={getBarColor(entry.sources)} 
                                    onClick={() => onSelectCluster(entry.cluster_id)}
                                    className="chart-bar-hover"
                                    cursor="pointer"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}