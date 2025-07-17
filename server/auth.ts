import { Request, Response, NextFunction } from "express";
import { db } from "./db.js";
import { authSessions } from "@shared/schema.js";
import { eq, gt } from "drizzle-orm";
import crypto from "crypto";

// Simple password - you can change this to whatever you want
const APP_PASSWORD = process.env.APP_PASSWORD || "ai-news-2025";

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

export interface AuthenticatedRequest extends Request {
  isAuthenticated?: boolean;
  sessionId?: string;
}

// Create or update authentication session
export async function createAuthSession(sessionId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  
  try {
    // Try to update existing session first
    const updated = await db
      .update(authSessions)
      .set({ 
        isAuthenticated: true, 
        expiresAt,
        createdAt: new Date()
      })
      .where(eq(authSessions.sessionId, sessionId))
      .returning();

    // If no existing session, create new one
    if (updated.length === 0) {
      await db.insert(authSessions).values({
        sessionId,
        isAuthenticated: true,
        expiresAt
      });
    }
  } catch (error) {
    console.error("Error creating auth session:", error);
    throw error;
  }
}

// Check if session is authenticated
export async function isSessionAuthenticated(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;

  try {
    const session = await db
      .select()
      .from(authSessions)
      .where(eq(authSessions.sessionId, sessionId))
      .limit(1);

    if (session.length === 0) return false;

    const authSession = session[0];
    
    // Check if session is expired
    if (new Date() > authSession.expiresAt) {
      // Clean up expired session
      await db
        .delete(authSessions)
        .where(eq(authSessions.sessionId, sessionId));
      return false;
    }

    return authSession.isAuthenticated;
  } catch (error) {
    console.error("Error checking session:", error);
    return false;
  }
}

// Verify password
export function verifyPassword(password: string): boolean {
  return password === APP_PASSWORD;
}

// Generate session ID
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Authentication middleware
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];

  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const authenticated = await isSessionAuthenticated(sessionId);
  
  if (!authenticated) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  req.isAuthenticated = true;
  req.sessionId = sessionId;
  next();
}

// Clean up expired sessions (run periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await db
      .delete(authSessions)
      .where(gt(new Date(), authSessions.expiresAt));
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
  }
}