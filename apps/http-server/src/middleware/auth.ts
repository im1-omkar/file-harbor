import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  storageLimit: bigint;
  storageUsed: bigint;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
      }
      res.clearCookie("session_id");
      res.status(401).json({ error: "Session expired or invalid" });
      return;
    }

    req.user = session.user;
    req.sessionId = session.id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
