// mcp-server.js
import express from 'express';
import cors from 'cors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { z } from 'zod';

// Create an MCP server with minimal configuration
const server = new McpServer({
  name: "MinimalServer",
  version: "1.0.0"
});

// Add a simple echo tool
server.tool(
  "echo",
  { message: z.string() },
  async ({ message }) => ({
    content: [{ type: "text", text: `You said: ${message}` }]
  })
);

// Add a simple resource
server.resource(
  "info",
  "info://server",
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: "This is a minimal MCP server with SSE transport."
    }]
  })
);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());
app.use(express.json());

// Store active transports by session ID
const transports = {};

// SSE endpoint
app.get('/sse', async (req, res) => {
  // Create SSE transport with path to post messages
  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${protocol}://${host}`;
  
  // Create SSE transport with absolute URL for messages
  const messageUrl = `${baseUrl}/messages`;
  const transport = new SSEServerTransport(messageUrl, res);
  const sessionId = transport.sessionId;
  
  // Store transport
  transports[sessionId] = transport;
  
  // Cleanup on connection close
  res.on('close', () => {
    delete transports[sessionId];
  });
  
  // Connect server to transport
  await server.connect(transport);
});

// Messages endpoint for receiving client messages
app.post('/messages', async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No active session found for the provided sessionId');
  }
});

// Add a simple status endpoint
app.get('/status', (_, res) => {
  res.json({
    status: 'ok',
    activeSessions: Object.keys(transports).length
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`MCP Server running on port ${PORT}`);
});