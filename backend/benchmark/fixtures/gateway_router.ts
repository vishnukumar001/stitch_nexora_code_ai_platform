import { Request, Response, NextFunction } from 'express';

export interface RouteConfig {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS';
  rateLimit: number;
  authRequired: boolean;
  corsEnabled: boolean;
}

export interface GatewayMetrics {
  totalRequests: number;
  corsBlocked: number;
  authFailures: number;
  avgLatencyMs: number;
}

// Global allowed origins whitelist
export const ALLOWED_ORIGINS = [
  'https://nexora.dev',
  'https://app.nexora.dev',
  'http://localhost:3000',
  'http://localhost:8000',
];

// TARGET LOCUS: Regression in CORS Preflight Header handling
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers['origin'] as string;

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // BUG: Preflight OPTIONS request missing Access-Control-Allow-Headers and Access-Control-Max-Age
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.status(204).end();
    return;
  }

  next();
}

// Unreferenced Middleware and Router Logic (Bloat pruned by AST scope slicer)
export class GatewayRouter {
  private routes: Map<string, RouteConfig> = new Map();
  private metrics: GatewayMetrics = {
    totalRequests: 0,
    corsBlocked: 0,
    authFailures: 0,
    avgLatencyMs: 0,
  };

  public registerRoute(config: RouteConfig): void {
    const key = `${config.method}:${config.path}`;
    this.routes.set(key, config);
  }

  public getRoute(method: string, path: string): RouteConfig | undefined {
    return this.routes.get(`${method}:${path}`);
  }

  public recordMetrics(latencyMs: number, success: boolean): void {
    this.metrics.totalRequests++;
    this.metrics.avgLatencyMs = (this.metrics.avgLatencyMs + latencyMs) / 2;
    if (!success) {
      this.metrics.authFailures++;
    }
  }

  public getMetrics(): GatewayMetrics {
    return { ...this.metrics };
  }
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[GATEWAY] ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)`);
  });
  next();
}

export function payloadDecompressor(req: Request, res: Response, next: NextFunction): void {
  const encoding = req.headers['content-encoding'];
  if (encoding === 'gzip' || encoding === 'deflate') {
    // decompression stub
  }
  next();
}
