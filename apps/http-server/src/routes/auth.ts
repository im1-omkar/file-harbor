import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

export const authRouter = Router();

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const googleAuthSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().optional(),
});

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

/**
 * POST /api/auth/signup
 */
authRouter.post("/signup", async (req, res) => {
  try {
    const { email, name, password } = signupSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ error: "Email is already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        storageLimit: 5368709120n, // 5 GiB
        storageUsed: 0n,
      },
    });

    const expiresAt = new Date(Date.now() + COOKIE_OPTIONS.maxAge);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    });

    res.cookie("session_id", session.id, COOKIE_OPTIONS);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        storageLimit: user.storageLimit.toString(),
        storageUsed: user.storageUsed.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Signup error:", error);
    res.status(500).json({ error: "Failed to create account" });
  }
});

/**
 * POST /api/auth/signin
 */
authRouter.post("/signin", async (req, res) => {
  try {
    const { email, password } = signinSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const expiresAt = new Date(Date.now() + COOKIE_OPTIONS.maxAge);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    });

    res.cookie("session_id", session.id, COOKIE_OPTIONS);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        storageLimit: user.storageLimit.toString(),
        storageUsed: user.storageUsed.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Signin error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

/**
 * POST /api/auth/signout
 */
authRouter.post("/signout", async (req: AuthenticatedRequest, res) => {
  const sessionId = req.cookies?.session_id;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
  }
  res.clearCookie("session_id");
  res.json({ success: true });
});

/**
 * GET /api/auth/me
 */
authRouter.get("/me", requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      storageLimit: user.storageLimit.toString(),
      storageUsed: user.storageUsed.toString(),
    },
  });
});

/**
 * POST /api/auth/google
 */
authRouter.post("/google", async (req, res) => {
  try {
    const { email, name, avatarUrl } = googleAuthSchema.parse(req.body);

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          avatarUrl: avatarUrl || null,
          storageLimit: 5368709120n, // 5 GiB
          storageUsed: 0n,
        },
      });
    }

    const expiresAt = new Date(Date.now() + COOKIE_OPTIONS.maxAge);
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
        userAgent: req.headers["user-agent"],
        ipAddress: req.ip,
      },
    });

    res.cookie("session_id", session.id, COOKIE_OPTIONS);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
        storageLimit: user.storageLimit.toString(),
        storageUsed: user.storageUsed.toString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: error.errors[0].message });
      return;
    }
    console.error("Google Auth error:", error);
    res.status(500).json({ error: "Google authentication failed" });
  }
});
