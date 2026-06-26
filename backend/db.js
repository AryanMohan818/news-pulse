const Database = require('better-sqlite3');

// Read DB path from Docker environment or default to local shared volume
const DB_PATH = process.env.DB_PATH || '/data/news_pulse.db';

// Connect to SQLite
const db = new Database(DB_PATH);

// Enable Write-Ahead Logging to match Python's setting
db.pragma('journal_mode = WAL');

/**
 * Retrieves all clusters summary metrics.
 */
function getClusters() {
    const stmt = db.prepare(`
        SELECT c.id, c.label, c.created_at,
               COUNT(a.id) AS article_count,
               MIN(a.published_at) AS earliest_published,
               MAX(a.published_at) AS latest_published
        FROM clusters c
        JOIN articles a ON c.id = a.cluster_id
        GROUP BY c.id
        ORDER BY latest_published DESC
    `);
    return stmt.all();
}

/**
 * Retrieves a single cluster along with its full list of articles.
 */
function getClusterById(id) {
    const clusterStmt = db.prepare('SELECT id, label, created_at FROM clusters WHERE id = ?');
    const cluster = clusterStmt.get(id);
    if (!cluster) return null;

    const articlesStmt = db.prepare(`
        SELECT id, title, url, source, summary, published_at 
        FROM articles 
        WHERE cluster_id = ? 
        ORDER BY published_at DESC
    `);
    const articles = articlesStmt.all(id);

    return { ...cluster, articles };
}

/**
 * Formats cluster data specifically for Recharts horizontal timeline rendering.
 * Supports filtering by news organization (e.g. "?source=BBC News").
 */
function getTimelineData(sourceFilter = null) {
    let sql = `
        SELECT c.id AS cluster_id, 
               c.label,
               COUNT(a.id) AS article_count,
               MIN(a.published_at) AS start_time,
               MAX(a.published_at) AS end_time,
               GROUP_CONCAT(DISTINCT a.source) AS sources
        FROM clusters c
        JOIN articles a ON c.id = a.cluster_id
    `;
    
    const params = [];
    if (sourceFilter && sourceFilter !== 'all') {
        sql += ` WHERE a.source = ? `;
        params.push(sourceFilter);
    }
    
    sql += ` GROUP BY c.id ORDER BY end_time DESC `;
    
    return db.prepare(sql).all(...params);
}

/**
 * Checks the status of a background Python scraping job.
 */
function getJobStatus(jobId) {
    const stmt = db.prepare('SELECT * FROM ingest_jobs WHERE id = ?');
    return stmt.get(jobId);
}

module.exports = {
    getClusters,
    getClusterById,
    getTimelineData,
    getJobStatus
};