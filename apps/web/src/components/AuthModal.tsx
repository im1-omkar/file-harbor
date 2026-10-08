import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Mail, User, ArrowRight } from "lucide-react";
import { api, type UserProfile } from "../services/api";
import { GoogleLogin } from "@react-oauth/google";

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

  async function handleGoogleSuccess(credentialResponse: any) {
    if (!credentialResponse.credential) {
      setError("Google Authentication failed: No credential received.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await api.googleAuth({
        credential: credentialResponse.credential,
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
          <div className="flex justify-center w-full">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError("Google Authentication failed")}
              theme="filled_black"
              shape="rectangular"
              text="continue_with"
            />
          </div>

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
