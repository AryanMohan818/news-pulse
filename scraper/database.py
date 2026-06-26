import sqlite3
import os
from config import DB_PATH

def get_db_connection():
    """
    Creates and returns a connection to the SQLite database.
    Enables WAL mode for concurrent reading/writing between Python and Node.js.
    """
    # Ensure the directory containing the DB file exists
    db_dir = os.path.dirname(DB_PATH)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
        
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Allows accessing columns by dictionary key: row['title']
    
    # Enable Write-Ahead Logging (WAL). 
    # This prevents 'database is locked' errors when Node.js reads while Python is writing.
    conn.execute("PRAGMA journal_mode=WAL;")
    return conn


def init_db():
    """
    Initializes the database schema by creating required tables if they don't exist.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Clusters table: stores grouped topic categories
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clusters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
    """)
    
    # 2. Articles table: stores scraped news items linked to clusters
    cursor.execute("""
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
    """)
    
    # 3. Ingest jobs table: tracks background scraping progress for the Node API
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ingest_jobs (
        id TEXT PRIMARY KEY,
        status TEXT DEFAULT 'running',
        started_at TEXT DEFAULT (datetime('now')),
        completed_at TEXT,
        articles_fetched INTEGER DEFAULT 0,
        clusters_formed INTEGER DEFAULT 0,
        error TEXT
    );
    """)
    
    conn.commit()
    conn.close()


def insert_article(article):
    """
    Inserts a single article into the database.
    Uses 'INSERT OR IGNORE' on the unique URL column to prevent duplicate entries.
    
    Returns the inserted row ID, or None if it was a duplicate.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
    INSERT OR IGNORE INTO articles (title, url, source, summary, content, published_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        article.get("title"),
        article.get("url"),
        article.get("source"),
        article.get("summary"),
        article.get("content"),
        article.get("published_at")
    ))
    
    inserted_id = cursor.lastrowid if cursor.rowcount > 0 else None
    conn.commit()
    conn.close()
    return inserted_id


def get_unclustered_articles():
    """
    Retrieves all articles that haven't been assigned to a cluster yet.
    Converts sqlite3.Row objects into standard Python dictionaries.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM articles WHERE cluster_id IS NULL")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]


def save_cluster(label, article_ids):
    """
    Creates a new cluster record and assigns the given list of article IDs to it.
    Wraps both operations in a single database transaction.
    """
    if not article_ids:
        return None
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # 1. Create the cluster
        cursor.execute("INSERT INTO clusters (label) VALUES (?)", (label,))
        cluster_id = cursor.lastrowid
        
        # 2. Update all matching articles with the new cluster_id
        # We use executemany for high performance
        cursor.executemany(
            "UPDATE articles SET cluster_id = ? WHERE id = ?",
            [(cluster_id, a_id) for a_id in article_ids]
        )
        
        conn.commit()
        return cluster_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()


def create_ingest_job(job_id):
    """Creates a new tracking record for a scraper job."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR IGNORE INTO ingest_jobs (id, status) VALUES (?, 'running')", (job_id,))
    conn.commit()
    conn.close()


def update_ingest_job(job_id, status, articles_fetched=0, clusters_formed=0, error=None):
    """Updates the tracking record when a job finishes or fails."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE ingest_jobs 
    SET status = ?, 
        completed_at = datetime('now'),
        articles_fetched = ?,
        clusters_formed = ?,
        error = ?
    WHERE id = ?
    """, (status, articles_fetched, clusters_formed, error, job_id))
    conn.commit()
    conn.close()