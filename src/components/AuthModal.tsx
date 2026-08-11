import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  LogOut,
  UserCheck,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Sparkles,
} from 'lucide-react';
import {
  loginWithGoogle,
  loginWithEmailAndMasterPassword,
  signupWithEmailAndMasterPassword,
} from '../lib/authService';
import { evaluatePasswordStrength } from '../lib/crypto';
import { User } from '../lib/firebase';

interface AuthModalProps {
  currentUser: User | null;
  onAuthSuccess: (user: User, masterPasswordUsed?: string) => void;
  onLogout: () => void;
  onContinueOffline?: () => void;
  onClose?: () => void;
  isInline?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  currentUser,
  onAuthSuccess,
  onLogout,
  onContinueOffline,
  onClose,
  isInline = false,
}) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordStrength = evaluatePasswordStrength(masterPassword);

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle();
      onAuthSuccess(user);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google Sign-In window was closed before completing.');
      } else {
        setError(err?.message || 'Google Sign-In failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !masterPassword) {
      setError('Please provide both email address and master password.');
      return;
    }

    if (isSignUp) {
      if (masterPassword !== confirmPassword) {
        setError('Master Passwords do not match.');
        return;
      }

      if (passwordStrength.score < 35) {
        setError('Please choose a stronger master password (minimum 12 characters recommended).');
        return;
      }
    }

    setLoading(true);
    try {
      let user: User;
      if (isSignUp) {
        user = await signupWithEmailAndMasterPassword(email.trim(), masterPassword);
      } else {
        user = await loginWithEmailAndMasterPassword(email.trim(), masterPassword);
      }

      onAuthSuccess(user, masterPassword);
      if (onClose) onClose();
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid email address or master password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please Sign In instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak for account authentication.');
      } else {
        setError(err?.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className={`${isInline ? 'p-6 bg-slate-900/90 rounded-2xl border border-slate-800' : ''} space-y-4 text-center`}>
        <div className="flex items-center justify-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
          {currentUser.photoURL ? (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'User'}
              className="w-10 h-10 rounded-full border border-emerald-400"
              referrerPolicy="no-referrer"
            />
          ) : (
            <UserCheck className="w-8 h-8 text-emerald-400" />
          )}
          <div className="text-left">
            <p className="font-semibold text-white">{currentUser.displayName || currentUser.email}</p>
            <p className="text-xs text-emerald-400">Authenticated & Cloud Sync Active</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs flex items-center justify-center gap-2 border border-slate-700 transition-all"
        >
          <LogOut className="w-4 h-4 text-slate-400" />
          Sign Out of Account
        </button>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-3">
          <ShieldCheck className="h-6 w-6 text-white" />
        </div>
        <h3 className="text-xl font-extrabold text-white tracking-tight">
          {isSignUp ? 'Create Aegis Vault Account' : 'Sign In to Aegis Vault'}
        </h3>
        <p className="mt-1 text-xs text-slate-400">
          Sync your zero-knowledge encrypted vault across device sessions
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Google Authentication Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center gap-3 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>

      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-800 w-full" />
        <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500 font-semibold absolute">
          or use email & master password
        </span>
      </div>

      {/* Email & Master Password Form */}
      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Email Address
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs transition-all pl-10"
            />
            <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Master Password
            </label>
            {isSignUp && (
              <span className={`text-[10px] font-bold uppercase ${passwordStrength.color.replace('bg-', 'text-')}`}>
                {passwordStrength.rating}
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="Enter Master Password..."
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs transition-all pl-10 pr-10"
            />
            <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isSignUp && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Confirm Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Master Password..."
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs transition-all pl-10"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : isSignUp ? (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Register & Create Vault Account</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Sign In & Sync Vault</span>
            </>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError('');
          }}
          className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Register Email'}
        </button>

        {onContinueOffline && (
          <button
            type="button"
            onClick={onContinueOffline}
            className="text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors"
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Use Offline Mode</span>
          </button>
        )}
      </div>
    </div>
  );

  if (isInline) {
    return (
      <div className="max-w-md mx-auto p-6 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-xl">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-md w-full p-6 bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl space-y-4">
        {content}
        {onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 text-center text-xs text-slate-500 hover:text-slate-300 font-medium"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
