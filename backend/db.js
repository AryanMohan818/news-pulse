const Database = require('better-sqlite3');

const path = require('path');
const fs = require('fs');

// Read DB path from environment or fallback to local ./data folder
let DB_PATH = process.env.DB_PATH;
if (!DB_PATH) {
    const localDataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(localDataDir)) {
        fs.mkdirSync(localDataDir, { recursive: true });
    }
    DB_PATH = path.join(localDataDir, 'news_pulse.db');
} else {
    // If custom DB_PATH (e.g. /data/news_pulse.db) is set, ensure folder exists
    const parentDir = path.dirname(DB_PATH);
    if (!fs.existsSync(parentDir)) {
        try { fs.mkdirSync(parentDir, { recursive: true }); } catch (e) {}
    }
}

// Connect to SQLite
const db = new Database(DB_PATH);

// Enable Write-Ahead Logging to match Python's setting
db.pragma('journal_mode = WAL');

// Ensure database tables exist (prevents 'no such table' 500 errors on cold cloud starts)
db.exec(`
    CREATE TABLE IF NOT EXISTS clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        url TEXT UNIQUE NOT NULL,
        source TEXT NOT NULL,
        summary TEXT,
        content TEXT,
        published_at TEXT,
        cluster_id INTEGER,
        fetched_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cluster_id) REFERENCES clusters(id)
    );

    CREATE TABLE IF NOT EXISTS ingest_jobs (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'running',
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        articles_fetched INTEGER DEFAULT 0,
        clusters_formed INTEGER DEFAULT 0,
        error TEXT
    );
`);

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
    db,
    DB_PATH,
    getClusters,
    getClusterById,
    getTimelineData,
    getJobStatus
};