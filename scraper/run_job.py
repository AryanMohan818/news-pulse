import sys
from app import run_scraping_pipeline, init_db

if __name__ == "__main__":
    init_db()
    job_id = sys.argv[1] if len(sys.argv) > 1 else None
    run_scraping_pipeline(job_id)
