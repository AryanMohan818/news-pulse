import feedparser
import time
from bs4 import BeautifulSoup
from config import FEEDS, USER_AGENT

def clean_html(raw_html):
    """
    Strips raw HTML tags (links, images, paragraph tags) from feed summaries
    so our TF-IDF text clusterer receives pure plaintext.
    """
    if not raw_html:
        return ""
    soup = BeautifulSoup(raw_html, "html.parser")
    return soup.get_text(separator=" ").strip()


def parse_feed_date(entry):
    """
    Converts feedparser's parsed time struct into a standardized ISO 8601 string:
    'YYYY-MM-DDTHH:MM:SSZ'
    Falls back to current UTC timestamp if the feed lacks a valid published date.
    """
    if hasattr(entry, "published_parsed") and entry.published_parsed:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", entry.published_parsed)
    elif hasattr(entry, "updated_parsed") and entry.updated_parsed:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", entry.updated_parsed)
    else:
        return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def fetch_feed_articles(feed_config, max_articles=25):
    """
    Fetches and parses a single RSS feed.
    Returns a normalized list of article dictionaries.
    """
    print(f"📡 Fetching RSS feed: {feed_config['name']} ({feed_config['url']})...")
    
    # Pass custom USER_AGENT so news servers don't block us as an anonymous bot
    parsed = feedparser.parse(feed_config["url"], agent=USER_AGENT)
    
    articles = []
    # Grab up to max_articles latest posts
    for entry in parsed.entries[:max_articles]:
        title = entry.get("title", "").strip()
        url = entry.get("link", "").strip()
        
        # Skip invalid entries missing title or link
        if not title or not url:
            continue
            
        # feedparser puts both description and summary into entry.summary
        raw_summary = entry.get("summary", entry.get("description", ""))
        clean_summary = clean_html(raw_summary)
        
        iso_date = parse_feed_date(entry)
        
        articles.append({
            "title": title,
            "url": url,
            "source": feed_config["name"],
            "summary": clean_summary,
            "content": None,  # Will be extracted in the next step by extractor.py
            "published_at": iso_date
        })
        
    return articles


def get_all_feed_articles():
    """
    Loops through all configured feeds in config.FEEDS, aggregates the results,
    and returns a single unified list of all recent news items.
    """
    all_articles = []
    for feed in FEEDS:
        try:
            items = fetch_feed_articles(feed)
            all_articles.extend(items)
            print(f"   -> Successfully retrieved {len(items)} items from {feed['name']}")
        except Exception as e:
            print(f"⚠️ Error fetching feed {feed['name']}: {e}")
            
    print(f"✅ Total normalized articles fetched across all feeds: {len(all_articles)}")
    return all_articles