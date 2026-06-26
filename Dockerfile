# Official Python runtime as base image
FROM python:3.11-slim

# Install Node.js, npm, and C++ compiler tools for SQLite
RUN apt-get update && apt-get install -y \
    nodejs \
    npm \
    build-essential \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy full repository
COPY . .

# Install Python machine learning dependencies (scikit-learn, trafilatura, feedparser)
RUN pip install --no-cache-dir -r scraper/requirements.txt

# Install Node Express API dependencies
RUN cd backend && npm install

# Ensure database storage directory exists
RUN mkdir -p data /data

ENV DB_PATH=/app/data/news_pulse.db
ENV SCRAPER_URL=http://127.0.0.1:5000
ENV PYTHONUNBUFFERED=1

EXPOSE 3001

# Start Python Scraper microservice (port 5000) in background, then launch Node API (using dynamic PORT assigned by cloud provider)
CMD python3 scraper/app.py & cd backend && node index.js
