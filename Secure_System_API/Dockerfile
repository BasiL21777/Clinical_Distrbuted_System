# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm install --production

# Copy source
COPY . .

# private_uploads lives on a Docker volume — create the dir so it exists
RUN mkdir -p /app/private_uploads

EXPOSE 5000

CMD ["node", "index.js"]
