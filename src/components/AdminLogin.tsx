/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api.js';
import { AdminUser } from '../types/index.js';

interface AdminLoginProps {
  onLoginSuccess: (user: AdminUser) => void;
  onGoToPublicVerification: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onGoToPublicVerification,
}) => {
  const [username, setUsername] = useState('Anirudh Hatwar');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await api.login(username.trim(), password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setError('Login failed: Invalid credentials');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials or rate limits.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-md w-full space-y-6">
        
        {/* Header Badge */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-1">
            <img
              src="/assets/cosmogeek-emblem.png"
              alt="Cosmogeek 3D Emblem"
              className="w-16 h-16 object-contain drop-shadow-md select-none transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div className="flex justify-center">
            <img
              src="/assets/cosmogeek-wordmark.png"
              alt="Cosmogeek Software Solutions Pvt. Ltd."
              className="h-5 sm:h-6 w-auto object-contain select-none"
            />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Administrator Portal</h1>
          <p className="text-xs text-slate-500">
            Certificate Generation &amp; QR Cryptographic Verification Registry
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <span className="text-xs font-bold text-[#003B73] uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#0080FF]" />
              <span>Admin Sign In</span>
            </span>
            <span className="text-[10px] font-semibold text-[#003B73] bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
              SECURE SESSION
            </span>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 flex items-start gap-3 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Anirudh Hatwar"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Link to Public Verification */}
        <div className="text-center">
          <a
            href="/verify"
            onClick={(e) => {
              e.preventDefault();
              onGoToPublicVerification();
            }}
            className="text-xs font-medium text-slate-600 hover:text-[#0080FF] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-[#0080FF]" />
            <span>Go to Public QR Certificate Verification Portal</span>
          </a>
        </div>

      </div>
    </div>
  );
};
