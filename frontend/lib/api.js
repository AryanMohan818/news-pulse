// Base API URL resolved from Docker Compose / Next environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Fetches all topic clusters summaries.
 */
export async function getClusters() {
    const res = await fetch(`${API_BASE_URL}/clusters`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch clusters");
    return res.json();
}

/**
 * Fetches a single cluster with full article body list.
 */
export async function getClusterDetail(id) {
    const res = await fetch(`${API_BASE_URL}/clusters/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch cluster detail");
    return res.json();
}

/**
 * Fetches Recharts timeline data. Supports optional source filter.
 */
export async function getTimelineData(source = 'all') {
    const url = source && source !== 'all' 
        ? `${API_BASE_URL}/timeline?source=${encodeURIComponent(source)}`
        : `${API_BASE_URL}/timeline`;
        
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to fetch timeline data");
    return res.json();
}

/**
 * Triggers a live scraping ingestion run on the backend.
 */
export async function triggerIngestion() {
    const res = await fetch(`${API_BASE_URL}/ingest/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) throw new Error("Failed to trigger ingestion");
    return res.json();
}

/**
 * Polls the background status of an active ingestion job.
 */
export async function getJobStatus(jobId) {
    const res = await fetch(`${API_BASE_URL}/ingest/status/${jobId}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Failed to check job status");
    return res.json();
}