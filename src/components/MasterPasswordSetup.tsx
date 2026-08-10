import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Sparkles,
  Key,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { evaluatePasswordStrength } from '../lib/crypto';
import { Credential } from '../types';

interface MasterPasswordSetupProps {
  onSetupComplete: (masterPassword: string, initialCredentials: Credential[]) => Promise<void>;
}

const SAMPLE_DEMO_CREDENTIALS: Credential[] = [
  {
    id: 'demo-1',
    websiteName: 'Google Account',
    websiteUrl: 'https://myaccount.google.com',
    username: 'alex.dev@gmail.com',
    password: 'v&8$K2m!P9#xQzL',
    category: 'Personal',
    notes: 'Primary Gmail & Cloud services. 2FA enabled with Authenticator.',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-2',
    websiteName: 'GitHub',
    websiteUrl: 'https://github.com',
    username: 'alexdev2026',
    password: 'G#92m!Xq$81pLzk',
    category: 'Work',
    notes: 'Developer repositories & SSH keys backup.',
    isFavorite: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'demo-3',
    websiteName: 'Streaming Service',
    websiteUrl: 'https://netflix.com',
    username: 'alex.family@gmail.com',
    password: 'password123', // Intentional weak password for demonstration of Audit
    category: 'Entertainment',
    notes: 'Standard 4K family tier.',
    isFavorite: false,
    createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(), // > 180 days old
    updatedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MasterPasswordSetup: React.FC<MasterPasswordSetupProps> = ({
  onSetupComplete,
}) => {
  const [masterPassword, setMasterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loadSampleData, setLoadSampleData] = useState(true);
  const [acknowledgedWarning, setAcknowledgedWarning] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const strength = evaluatePasswordStrength(masterPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!masterPassword) {
      setErrorMessage('Master Password is required.');
      return;
    }

    if (masterPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    if (strength.score < 40) {
      setErrorMessage('Please choose a stronger master password (minimum 12 characters recommended).');
      return;
    }

    if (!acknowledgedWarning) {
      setErrorMessage('You must acknowledge that losing your master password renders vault data unrecoverable.');
      return;
    }

    try {
      setIsDeriving(true);
      const initial = loadSampleData ? SAMPLE_DEMO_CREDENTIALS : [];
      await onSetupComplete(masterPassword, initial);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Failed to set up encryption vault: ' + (err?.message || 'Unknown error'));
      setIsDeriving(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl w-full space-y-8 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25 mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create Master Password
          </h2>
          <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
            Your Master Password is the single key that encrypts and unlocks your entire vault using{' '}
            <strong className="text-blue-400 font-medium">AES-256-GCM</strong> and{' '}
            <strong className="text-blue-400 font-medium">PBKDF2-SHA256 (600,000 iterations)</strong>.
          </p>
        </div>

        {/* Security Alert Banner */}
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 text-xs text-amber-200/90 flex gap-3 items-start">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300 text-sm mb-1">Zero-Knowledge Security Warning</p>
            <p>
              We never store your master password on any server or database. If you forget your Master Password,
              there is no "forgot password" reset link — your encrypted vault cannot be decrypted. Store a copy in a safe offline location.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Master Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter a strong, memorable master password..."
                required
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {/* Password Strength Meter */}
            {masterPassword && (
              <div className="space-y-2 mt-3 pt-2 border-t border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Strength Rating:</span>
                  <span className={`font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.rating} ({strength.score}/100)
                  </span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${strength.color} transition-all duration-300`}
                    style={{ width: `${Math.max(5, strength.score)}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400 flex justify-between">
                  <span>Entropy: {strength.entropyBits} bits</span>
                  <span>Estimated crack time: {strength.crackTimeFormatted}</span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Confirm Master Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your master password to verify..."
              required
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
            />
            {confirmPassword && masterPassword !== confirmPassword && (
              <p className="text-xs text-red-400 font-medium mt-1">Passwords do not match.</p>
            )}
            {confirmPassword && masterPassword === confirmPassword && (
              <p className="text-xs text-emerald-400 font-medium mt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match!
              </p>
            )}
          </div>

          {/* Options & Acknowledgement */}
          <div className="space-y-3 pt-2">
            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300 group">
              <input
                type="checkbox"
                checked={loadSampleData}
                onChange={(e) => setLoadSampleData(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <div>
                <span className="font-semibold text-slate-200">Pre-load sample demo accounts</span>
                <p className="text-slate-400 text-[11px]">Includes sample Google, GitHub, and Netflix items to test search & security audit features immediately.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer text-xs text-slate-300 group">
              <input
                type="checkbox"
                checked={acknowledgedWarning}
                onChange={(e) => setAcknowledgedWarning(e.target.checked)}
                className="mt-0.5 rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <span className="font-medium text-slate-200">
                I understand that losing my Master Password means my encrypted vault data cannot be recovered.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isDeriving || !masterPassword || masterPassword !== confirmPassword || !acknowledgedWarning}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {isDeriving ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Deriving Key (600,000 PBKDF2 Iterations)...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="h-5 w-5" />
                <span>Initialize Encrypted Vault</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
