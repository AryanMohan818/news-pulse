import os

# Database Path - defaulting to /data/news_pulse.db inside the docker volume
DB_PATH = os.environ.get("DB_PATH", "/data/news_pulse.db")

# RSS Feeds to monitor
FEEDS = [
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml"},
    {"name": "NPR News", "url": "https://feeds.npr.org/1001/rss.xml"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml"}
]

# Request headers to look like a real browser
USER_AGENT = "NewsPulseBot/1.0 (+http://localhost:3000)"
REQUEST_TIMEOUT = 10  # seconds