FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

# Run Next.js in development mode
CMD ["npm", "run", "dev"]