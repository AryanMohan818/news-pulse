import threading
import uuid
from flask import Flask, request, jsonify
from database import init_db, insert_article, get_unclustered_articles, save_cluster, create_ingest_job, update_ingest_job
from feeds import get_all_feed_articles
from extractor import enrich_articles_with_content
from clusterer import cluster_articles

app = Flask(__name__)

# Initialize database tables on server startup
init_db()

def run_scraping_pipeline(job_id=None):
    """
    Executes the full end-to-end news processing workflow:
    Fetch RSS -> Extract Full Bodies -> Save to DB -> TF-IDF Cluster -> Save Clusters.
    Runs inside an independent background thread.
    """
    print(f"\n🚀 [Job {job_id}] Starting Scraping Pipeline...")
    try:
        # 1. Fetch normalized RSS previews
        raw_articles = get_all_feed_articles()
        
        # 2. Extract full body HTML plaintext
        enriched_articles = enrich_articles_with_content(raw_articles)
        
        # 3. Insert into SQLite (counting newly inserted unique URLs)
        new_count = 0
        for article in enriched_articles:
            res = insert_article(article)
            if res:
                new_count += 1
                
        print(f"📥 [Job {job_id}] Inserted {new_count} brand new articles into database.")
        
        # 4. Fetch all unclustered articles in DB
        unclustered = get_unclustered_articles()
        
        # 5. Run TF-IDF & Agglomerative Clustering
        formed_clusters = cluster_articles(unclustered)
        
        # 6. Save formed clusters & assign cluster_ids to articles
        for c in formed_clusters:
            save_cluster(c["label"], c["article_ids"])
            
        print(f"🏁 [Job {job_id}] Pipeline Complete! {new_count} articles, {len(formed_clusters)} clusters.")
        
        if job_id:
            update_ingest_job(job_id, status="completed", articles_fetched=new_count, clusters_formed=len(formed_clusters))
            
    except Exception as e:
        print(f"❌ [Job {job_id}] Pipeline Fatal Error: {e}")
        if job_id:
            update_ingest_job(job_id, status="failed", error=str(e))


@app.route("/", methods=["GET"])
def health_check():
    """Simple health check endpoint for Docker."""
    return jsonify({"status": "ok", "service": "news-pulse-scraper", "version": "1.0"})


@app.route("/run", methods=["POST"])
def trigger_run():
    """
    Triggered by the Node.js API to kick off an ingestion job.
    Accepts optional '?jobId=' query parameter.
    """
    job_id = request.args.get("jobId") or request.json.get("jobId") if request.is_json else None
    if not job_id:
        job_id = f"job_{uuid.uuid4().hex[:8]}"
        
    create_ingest_job(job_id)
    
    # Spawn background thread so HTTP request returns instantly
    thread = threading.Thread(target=run_scraping_pipeline, args=(job_id,))
    thread.daemon = True
    thread.start()
    
    return jsonify({
        "status": "accepted",
        "message": "Scraping pipeline started in background",
        "jobId": job_id
    }), 202


if __name__ == "__main__":
    print("🐍 Python Scraper Microservice ready on port 5000...")
    app.run(host="0.0.0.0", port=5000)