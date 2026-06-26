# Use the official Node.js runtime as the parent image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package files first (helps with caching docker layers)
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the API port
EXPOSE 3001

# Start the Node.js server
CMD ["npm", "start"]