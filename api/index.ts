import 'dotenv/config';
// On Vercel, we import the bundled output produced by tsup.
// This ensures all generated code and dependencies are resolved.
import serverInstancePromise from '../dist/index.js';

export default async function handler(req: any, res: any) {
  const host = req.headers?.host || 'localhost';
  const url = new URL(req.url || '/', `https://${host}`);
  const pathname = url.pathname;

  // Simple health checks or root bypass
  if (pathname === '/' || pathname === '/health' || pathname === '/healthz') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.end('Microsoft 365 MCP Server is running');
  }

  if (pathname === '/favicon.ico' || pathname === '/favicon.png' || pathname === '/robots.txt') {
    res.statusCode = 204;
    return res.end();
  }

  try {
    // The bundled index.js default exports the createServer promise
    const server = await serverInstancePromise;
    
    // Access the express app from the server instance
    if (server && (server as any).app) {
      return (server as any).app(req, res);
    }

    res.statusCode = 500;
    return res.end('Server failed to initialize handler');
  } catch (error) {
    console.error('Failed to initialize Microsoft 365 MCP Server:', error);
    res.statusCode = 500;
    return res.end('Server failed to initialize');
  }
}
