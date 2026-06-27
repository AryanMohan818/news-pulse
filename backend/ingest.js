// Read the scraper microservice URL from Docker Compose environment
const SCRAPER_URL = process.env.SCRAPER_URL || 'http://scraper:5000';

/**
 * Triggers an asynchronous scraping job on the Python microservice.
 * Returns the generated jobId immediately.
 */
async function triggerScraperService() {
    // Generate a random job tracking ID
    const jobId = 'job_' + Math.random().toString(16).slice(2, 10);
    
    console.log(`📡 Pinging Scraper Microservice at ${SCRAPER_URL}/run?jobId=${jobId}...`);
    
    try {
        const response = await fetch(`${SCRAPER_URL}/run?jobId=${jobId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
            throw new Error(`Scraper microservice returned HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(` -> Scraper accepted job:`, data);
        
        return jobId;
    } catch (error) {
        console.error(`❌ Error communicating with Python scraper:`, error.message);
        throw error;
    }
}

module.exports = {
    triggerScraperService
};