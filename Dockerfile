FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY mcp-server.js ./

# Expose the port
EXPOSE 3000

# Start the server
CMD ["npm", "start"]