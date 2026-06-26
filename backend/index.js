require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { triggerScraperService } = require('./ingest');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Allows frontend on port 3000 to call us without CORS errors
app.use(express.json());

// 1. Health check
app.get('/', (req, res) => {
    res.json({ status: "ok", service: "news-pulse-backend-api" });
});

// 2. List all topic clusters
app.get('/clusters', (req, res) => {
    try {
        const clusters = db.getClusters();
        res.json(clusters);
    } catch (error) {
        console.error("Error fetching clusters:", error);
        res.status(500).json({ error: "Failed to retrieve clusters" });
    }
});

// 3. Get single cluster with full article details
app.get('/clusters/:id', (req, res) => {
    try {
        const cluster = db.getClusterById(req.params.id);
        if (!cluster) {
            return res.status(404).json({ error: "Cluster not found" });
        }
        res.json(cluster);
    } catch (error) {
        console.error("Error fetching cluster detail:", error);
        res.status(500).json({ error: "Failed to retrieve cluster details" });
    }
});

// 4. Get timeline formatted data (supports "?source=BBC News")
app.get('/timeline', (req, res) => {
    try {
        const sourceFilter = req.query.source || null;
        const timeline = db.getTimelineData(sourceFilter);
        res.json(timeline);
    } catch (error) {
        console.error("Error fetching timeline data:", error);
        res.status(500).json({ error: "Failed to retrieve timeline data" });
    }
});

// 5. Trigger live news ingestion
app.post('/ingest/trigger', async (req, res) => {
    try {
        const jobId = await triggerScraperService();
        res.json({ success: true, jobId, message: "Ingestion triggered" });
    } catch (error) {
        res.status(502).json({ success: false, error: "Failed to reach Scraper Microservice" });
    }
});

// 6. Poll ingestion job status
app.get('/ingest/status/:jobId', (req, res) => {
    try {
        const status = db.getJobStatus(req.params.jobId);
        if (!status) {
            return res.status(404).json({ status: "not_found" });
        }
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: "Failed to check job status" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 News Pulse Backend API live on port ${PORT}...`);
});