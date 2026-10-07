import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Mail, User, ArrowRight } from "lucide-react";
import { api, type UserProfile } from "../services/api";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserProfile) => void;
  initialMode?: "signin" | "signup";
}

export function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  initialMode = "signin",
}: AuthModalProps) {
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await api.signup({ email, name, password });
        onSuccess(res.user);
      } else {
        const res = await api.signin({ email, password });
        onSuccess(res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setLoading(true);

    try {
      // Prompt for name/email or simulate Google OAuth payload
      const mockEmail = email || `user_${Math.floor(Math.random() * 10000)}@gmail.com`;
      const mockName = name || "Google User";
      const res = await api.googleAuth({
        email: mockEmail,
        name: mockName,
        avatarUrl: "https://api.dicebear.com/7.x/identicon/svg?seed=" + mockEmail,
      });
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      setError(err.message || "Google Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-md bg-black border border-zinc-800 rounded-lg p-6 shadow-2xl space-y-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h2 className="text-base font-semibold text-white">
                {mode === "signin" ? "Sign In to File Harbor" : "Create Account"}
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Unlock 5 GiB Free Encrypted Cloud Storage
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-white p-1 transition-colors rounded cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded p-3 text-xs text-red-400 font-mono">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alice Vance"
                    className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 font-mono focus:border-zinc-400 transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alice@example.com"
                  className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 font-mono focus:border-zinc-400 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-zinc-500 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-3 text-zinc-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-black border border-zinc-800 rounded-md pl-9 pr-3 py-2 text-sm text-white placeholder-zinc-600 font-mono focus:border-zinc-400 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? "Processing..." : mode === "signin" ? "Sign In" : "Create Account"}</span>
              <ArrowRight size={14} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <span className="relative bg-black px-2 text-[10px] font-mono text-zinc-500 uppercase">
              Or continue with
            </span>
          </div>

          {/* Google OAuth Option */}
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full bg-black border border-zinc-800 hover:border-zinc-700 text-zinc-300 font-medium text-sm py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 10.8 0 12.5s.7 2.8 1.9 5.2l3.7-2.9z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16c1.8 3.7 5.6 7 10.1 7z"
              />
            </svg>
            <span>Google OAuth</span>
          </button>

          {/* Toggle Mode */}
          <div className="text-center pt-2 text-xs font-mono text-zinc-500">
            {mode === "signin" ? (
              <span>
                Don't have an account?{" "}
                <button
                  onClick={() => {
                    setError(null);
                    setMode("signup");
                  }}
                  className="text-white hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </span>
            ) : (
              <span>
                Already have an account?{" "}
                <button
                  onClick={() => {
                    setError(null);
                    setMode("signin");
                  }}
                  className="text-white hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
