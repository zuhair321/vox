// ═══════════════════════════════════════════════════════════════
// VOX — API Documentation (OpenAPI 3.0)
// ═══════════════════════════════════════════════════════════════
import { Router } from 'express';

export const docsRouter = Router();

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'VOX API',
    description: 'Private messaging platform API',
    version: '1.0.0',
    contact: { name: 'VOX Team' },
    license: { name: 'MIT' },
  },
  servers: [
    { url: 'http://localhost:4000', description: 'Local development' },
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'username', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  username: { type: 'string', minLength: 3, maxLength: 32, pattern: '^[a-zA-Z0-9_]+$' },
                  password: { type: 'string', minLength: 8, maxLength: 72 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account created' },
          '400': { description: 'Invalid input' },
          '409': { description: 'Email or username already taken' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Sign in to your account',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['emailOrUsername', 'password'],
                properties: {
                  emailOrUsername: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials' },
          '423': { description: 'Account locked' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Sign out',
        responses: { '200': { description: 'Logged out' } },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get current user',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'User profile' } },
      },
      patch: {
        tags: ['Auth'],
        summary: 'Update profile',
        security: [{ cookieAuth: [] }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  displayName: { type: 'string', maxLength: 32 },
                  bio: { type: 'string', maxLength: 255 },
                  status: { type: 'string', enum: ['ONLINE', 'IDLE', 'DND', 'OFFLINE'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated user' } },
      },
    },
    '/api/servers': {
      get: {
        tags: ['Servers'],
        summary: 'List user servers',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Server list' } },
      },
      post: {
        tags: ['Servers'],
        summary: 'Create a server',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: { name: { type: 'string', minLength: 2, maxLength: 100 } },
              },
            },
          },
        },
        responses: { '201': { description: 'Server created' } },
      },
    },
    '/api/servers/{id}': {
      get: {
        tags: ['Servers'],
        summary: 'Get server details',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Server details' } },
      },
    },
    '/api/channels/{id}/messages': {
      get: {
        tags: ['Messages'],
        summary: 'Get channel messages',
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } },
          { name: 'before', in: 'query', schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Message list' } },
      },
      post: {
        tags: ['Messages'],
        summary: 'Send a message',
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  content: { type: 'string' },
                  attachments: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Message sent' } },
      },
    },
    '/api/dms': {
      get: {
        tags: ['DMs'],
        summary: 'List DM conversations',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'DM list' } },
      },
    },
    '/api/friends': {
      get: {
        tags: ['Friends'],
        summary: 'List friends',
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Friend list' } },
      },
    },
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        responses: { '200': { description: 'Service healthy' } },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'vox_access',
        description: 'JWT access token in HttpOnly cookie',
      },
    },
  },
};

docsRouter.get('/docs.json', (_req, res) => {
  res.json(spec);
});

docsRouter.get('/docs', (_req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>VOX API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({ url: '/api/docs.json', dom_id: '#swagger-ui', presets: [SwaggerUIBundle.presets.apis] });
  </script>
</body>
</html>`);
});

export default docsRouter;
