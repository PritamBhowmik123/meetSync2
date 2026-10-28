import React, { useState } from 'react';
import { Video, Lock, Mail, User, AlertCircle, ArrowRight, Sparkles } from 'lucide-react';
import { authService } from '../services/auth';

export const AuthModal = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authService.login(email, password);
        onAuthSuccess(res.user);
      } else {
        const res = await authService.signup(name, email, password);
        onAuthSuccess(res.user);
      }
    } catch (err) {
      if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
        setError('Server was waking up from sleep mode (Render free tier). It is now ready — please try signing in again.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    if (isLogin) {
      setEmail('alex@meetsync.io');
      setPassword('password123');
    } else {
      setName('Alex Rivera');
      setEmail(`alex.${Math.floor(Math.random() * 1000)}@meetsync.io`);
      setPassword('password123');
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#202124] flex items-center justify-center p-4 sm:p-6 select-none">
      {/* Background ambient gradient */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600 via-transparent to-transparent"></div>

      <div className="w-full max-w-md bg-[#282a2d] border border-[#3c4043] rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* App Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
            <Video className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Meet<span className="text-[#8ab4f8]">Sync</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Connected to Neon DB Storage • Real-time Video Conferencing
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#202124] p-1 rounded-xl mb-6 border border-[#3c4043]">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${isLogin ? 'bg-[#3c4043] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${!isLogin ? 'bg-[#3c4043] text-white shadow' : 'text-gray-400 hover:text-white'
              }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-200">
            <AlertCircle size={16} className="text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="text-xs font-medium text-gray-300 block mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#202124] border border-[#3c4043] focus:border-[#8ab4f8] focus:outline-none text-white text-sm placeholder-gray-500 transition-colors"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#202124] border border-[#3c4043] focus:border-[#8ab4f8] focus:outline-none text-white text-sm placeholder-gray-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-300 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#202124] border border-[#3c4043] focus:border-[#8ab4f8] focus:outline-none text-white text-sm placeholder-gray-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-[#1a73e8] hover:bg-[#1765cc] disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/30 active:scale-[0.99]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <span>{isLogin ? 'Sign In to MeetSync' : 'Create Account'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Fill */}
        <div className="mt-5 pt-4 border-t border-[#3c4043]/60 flex items-center justify-between">
          <button
            type="button"
            onClick={fillDemoAccount}
            className="text-xs text-[#8ab4f8] hover:text-blue-300 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles size={13} />
            <span>Fill Demo Credentials</span>
          </button>
          <span className="text-[11px] text-gray-500">Neon DB v1 REST</span>
        </div>
      </div>
    </div>
  );
};

