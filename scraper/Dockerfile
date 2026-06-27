# Use the official Python runtime
FROM python:3.10-slim

# Install system dependencies needed for compiling certain Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the requirements file and install Python packages
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

ENV PYTHONUNBUFFERED=1

# We will run a lightweight Python web server (like Flask or FastAPI)
CMD ["python", "-u", "app.py"]