import requests
import trafilatura
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from config import USER_AGENT, REQUEST_TIMEOUT

def extract_full_text(url):
    """
    Visits the given news article URL and extracts the complete body plaintext.
    
    Uses 'trafilatura' (state-of-the-art news extractor) as primary method.
    Falls back to requests + BeautifulSoup if trafilatura encounters weird layouts.
    Returns the extracted text string, or None if extraction fails.
    """
    headers = {"User-Agent": USER_AGENT}
    
    try:
        # 1. Download the raw HTML page
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        if response.status_code != 200:
            return None
            
        html = response.text
        
        # 2. Primary Method: Trafilatura NLP extraction
        # Automatically strips ads, footers, headers, and related-article sidebars
        extracted_text = trafilatura.extract(
            html, 
            include_comments=False, 
            include_tables=False,
            no_fallback=False
        )
        
        if extracted_text and len(extracted_text.strip()) > 100:
            return extracted_text.strip()
            
        # 3. Fallback Method: BeautifulSoup paragraph aggregation
        # If trafilatura fails on custom paywall/interactive page wrappers
        soup = BeautifulSoup(html, "html.parser")
        
        # Look inside standard HTML5 <article> tags first
        article_elem = soup.find("article")
        if article_elem:
            paragraphs = article_elem.find_all("p")
        else:
            paragraphs = soup.find_all("p")
            
        text_blocks = [p.get_text().strip() for p in paragraphs if len(p.get_text().strip()) > 30]
        full_fallback_text = "\n\n".join(text_blocks)
        
        if len(full_fallback_text) > 100:
            return full_fallback_text
            
        return None
        
    except Exception as e:
        # Silent fail for network timeouts/connection resets so scraper doesn't crash
        return None


def enrich_articles_with_content(articles):
    """
    Takes a list of article dictionaries (from feeds.py) and populates
    their 'content' field with the scraped full body text using multithreading.
    """
    total = len(articles)
    print(f"\n🌐 Extracting full article body text concurrently for {total} articles...")
    
    def fetch_for_article(article):
        url = article["url"]
        body_text = extract_full_text(url)
        if body_text:
            article["content"] = body_text
            return True
        else:
            article["content"] = article["summary"]
            return False

    with ThreadPoolExecutor(max_workers=8) as executor:
        results = list(executor.map(fetch_for_article, articles))
        
    enriched_count = sum(1 for r in results if r)
    print(f"✅ Successfully extracted full content for {enriched_count}/{total} articles!")
    return articles