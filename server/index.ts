import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { ensureDatabaseConnection } from "./db";

const app = express();

// Force HTTPS redirect in production (only when deployed)
app.use((req, res, next) => {
  // Only enforce HTTPS in production AND when using a proxy (deployed environment)
  const isProduction = process.env.NODE_ENV === 'production';
  const hasProxy = req.header('x-forwarded-proto');
  const isHttp = req.header('x-forwarded-proto') === 'http';
  
  if (isProduction && hasProxy && isHttp) {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// Security headers (only in production)
app.use((req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isHTTPS = req.header('x-forwarded-proto') === 'https' || req.protocol === 'https';
  
  if (isProduction && isHTTPS) {
    // Force HTTPS for future requests
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // Prevent mixed content
    res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  }
  
  // Always set these security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Ensure database connection before starting server
    log("Checking database connection...");
    await ensureDatabaseConnection();
    log("Database connection established successfully");

    const server = await registerRoutes(app);

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      log(`Error ${status}: ${message}`);
      res.status(status).json({ message });
      
      // Don't throw the error in production to prevent crashes
      if (app.get("env") === "development") {
        console.error("Development error stack:", err);
      }
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on port 5000
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
