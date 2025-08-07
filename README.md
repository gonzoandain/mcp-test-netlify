# MCP Server on Netlify

This project demonstrates how to deploy an MCP (Model Context Protocol) server using Netlify Functions.

## Features

- **Core API Tools**: Access to business management APIs for branches, zones, and submanagements
- **Checklist API Tools**: Manage checklists, questions, questionnaires, and assignments 
- **Streamable HTTP Transport**: Uses the MCP Streamable HTTP protocol for real-time communication
- **Environment Configuration**: Configurable base URLs for different environments

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file with:
   ```env
   CORE_BASE=https://your-core-api.com
   CLIENT_BASE=https://your-client-api.com
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

4. **Deploy to Netlify**:
   - Connect your repository to Netlify
   - Set the build command to `npm run build`
   - Configure environment variables in Netlify dashboard

## Available Tools

### Core API Tools

- `core_list_sucursales` - List all branches
- `core_list_zonas` - List zones (with optional filtering)  
- `core_list_subgerencias` - List all submanagements
- `core_list_zonas_by_subgerencia` - Get zones by submanagement
- `core_list_sucursales_by_zona` - Get branches by zone

### Checklist API Tools

- `checklist_list_checks` - List active checklists
- `checklist_list_ambitos` - Get checklist scopes
- `checklist_list_preguntas` - Get checklist questions
- `checklist_list_cuestionarios` - Get executed questionnaires  
- `checklist_list_asignaciones` - Get questionnaire assignments
- `checklist_list_respuestas` - Get assignment responses

## Usage

Once deployed, your MCP server will be available at:
```
https://your-site.netlify.app/mcp
```

Connect to it using any MCP client by providing this URL.

### Testing with MCP Inspector

You can test your server using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

1. Install MCP Inspector: `npm install -g @modelcontextprotocol/inspector`
2. Run: `mcp-inspector`
3. Add your server URL: `https://your-site.netlify.app/mcp`
4. The inspector will automatically handle the initialization handshake
5. Click "List Tools" to see all available tools

**Note**: The server uses session-based communication, so the first request must be an initialization request. MCP clients handle this automatically.

## Local Development

Run locally with Netlify CLI:
```bash
npm run dev
```

Your server will be available at `http://localhost:8888/mcp`

## Architecture

- **`src/oneappServer.ts`** - MCP server implementation with all tools
- **`netlify/functions/mcp.ts`** - Netlify function handler that uses Streamable HTTP transport
- **Environment Variables** - Configure API base URLs through Netlify environment settings

## Technical Details

This implementation uses:
- MCP TypeScript SDK v1.2+
- Streamable HTTP transport for real-time communication  
- Zod for parameter validation
- Netlify Functions for serverless deployment
- TypeScript for type safety

## Troubleshooting

### "Server not initialized" Error

If you see this error when testing:
```
MCP error -32001: Error POSTing to endpoint (HTTP 400): {"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: Server not initialized"},"id":null}
```

This means the MCP client tried to call a method before sending an initialization request. The solution:

1. **Using MCP Inspector**: This should handle initialization automatically
2. **Using custom clients**: Ensure your client sends an `initialize` request first
3. **Manual testing**: Send a POST request with initialization payload before other requests

### Session Management

The server maintains sessions using the `mcp-session-id` header. After initialization:
- The server returns a session ID in the response headers
- All subsequent requests must include this session ID
- Sessions are automatically cleaned up when connections close


