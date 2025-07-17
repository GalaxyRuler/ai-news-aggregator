import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 10000,
  max: 1,
});

export const db = drizzle({ client: pool, schema });

// Database connection health check
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

// Graceful database connection with retry logic
export async function ensureDatabaseConnection(maxRetries = 5, retryDelay = 2000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const isConnected = await checkDatabaseConnection();
      if (isConnected) {
        return;
      }
    } catch (error) {
      console.error(`Database connection attempt ${i + 1} failed:`, error);
    }
    
    if (i < maxRetries - 1) {
      console.log(`Retrying database connection in ${retryDelay}ms...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw new Error(`Failed to connect to database after ${maxRetries} attempts`);
}