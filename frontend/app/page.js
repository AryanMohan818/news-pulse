'use client';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import SourceFilter from '../components/SourceFilter';
import RefreshButton from '../components/RefreshButton';
import Timeline from '../components/Timeline';
import ClusterDetail from '../components/ClusterDetail';
import { getTimelineData, getClusterDetail } from '../lib/api';

export default function Home() {
    const [timelineData, setTimelineData] = useState([]);
    const [activeSource, setActiveSource] = useState('all');
    const [activeCluster, setActiveCluster] = useState(null);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        let isMounted = true;

        async function fetchTimeline() {
            try {
                const data = await getTimelineData(activeSource);
                if (isMounted) setTimelineData(data);
            } catch (err) {
                console.error("Dashboard fetch error:", err);
            } finally {
                if (isMounted) setFetching(false);
            }
        }

        fetchTimeline();
        return () => { isMounted = false; };
    }, [activeSource]);

    async function handleOpenCluster(clusterId) {
        try {
            const fullDetail = await getClusterDetail(clusterId);
            setActiveCluster(fullDetail);
        } catch (err) {
            console.error("Detail load error:", err);
        }
    }

    // Event handler sets fetching=true instantly on click before updating source
    function handleSourceChange(newSource) {
        setFetching(true);
        setActiveSource(newSource);
    }

    function handleRefreshTrigger() {
        setFetching(true);
        // Trigger re-render of current source
        setActiveSource((prev) => prev === 'all' ? 'all ' : 'all'.trim()); 
    }

    return (
        <div className="app-viewport">
            <Header />

            <section className="control-toolbar">
                <SourceFilter activeSource={activeSource} onSelectSource={handleSourceChange} />
                <RefreshButton onRefreshComplete={handleRefreshTrigger} />
            </section>

            {fetching ? (
                <div className="loader-panel">
                    <div className="cyber-spinner"></div>
                    <p>Aggregating TF-IDF topic timeline...</p>
                </div>
            ) : (
                <Timeline data={timelineData} onSelectCluster={handleOpenCluster} />
            )}

            <ClusterDetail cluster={activeCluster} onClose={() => setActiveCluster(null)} />
        </div>
    );
}