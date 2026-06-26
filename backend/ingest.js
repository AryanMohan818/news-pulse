const { spawn } = require('child_process');
const path = require('path');
const db = require('./db');

// Read the scraper microservice URL from environment
const SCRAPER_URL = process.env.SCRAPER_URL;

/**
 * Triggers an asynchronous scraping job.
 * Works both via HTTP microservice ping (in Docker Compose) and local child_process spawn (on cloud servers).
 */
async function triggerScraperService() {
    const jobId = 'job_' + Math.random().toString(16).slice(2, 10);
    console.log(`📡 Triggering Ingestion Pipeline [Job ${jobId}]...`);
    
    // Insert initial tracking record into database
    try {
        db.db.prepare("INSERT OR IGNORE INTO ingest_jobs (id, status) VALUES (?, 'running')").run(jobId);
    } catch (e) {}

    // Option A: If SCRAPER_URL is explicitly configured (e.g. Docker network http://scraper:5000)
    if (SCRAPER_URL) {
        try {
            const response = await fetch(`${SCRAPER_URL}/run?jobId=${jobId}`, { method: 'POST' });
            if (response.ok) return jobId;
        } catch (e) {
            console.warn(`HTTP scraper ping failed (${e.message}), falling back to local Python spawn`);
        }
    }

    // Option B: Fallback to spawning Python pipeline directly as child process
    const pyScript = path.join(__dirname, '../scraper/run_job.py');
    const py = spawn('python3', [pyScript, jobId], {
        env: { ...process.env, DB_PATH: db.DB_PATH }
    });

    py.stdout.on('data', data => console.log(`[Python Scraper]: ${data}`));
    py.stderr.on('data', data => console.error(`[Python Scraper ERR]: ${data}`));
    py.on('close', code => console.log(`🏁 Python scraper job ${jobId} finished with code ${code}`));

    return jobId;
}

module.exports = {
    triggerScraperService
};