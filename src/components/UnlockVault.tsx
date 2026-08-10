import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldAlert, Key, RefreshCw, AlertOctagon } from 'lucide-react';

interface UnlockVaultProps {
  onUnlock: (masterPassword: string) => Promise<boolean>;
  onPurgeVaultRequest: () => void;
}

export const UnlockVault: React.FC<UnlockVaultProps> = ({
  onUnlock,
  onPurgeVaultRequest,
}) => {
  const [masterPassword, setMasterPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterPassword) return;

    setIsDecrypting(true);
    setErrorMessage('');

    try {
      // Introduce slight artificial delay if multiple failures to deter brute-force
      if (failedAttempts > 2) {
        await new Promise((res) => setTimeout(res, 1000 * Math.min(failedAttempts - 1, 5)));
      }

      const success = await onUnlock(masterPassword);
      if (!success) {
        setFailedAttempts((prev) => prev + 1);
        setErrorMessage('Invalid Master Password. Decryption failed.');
        setMasterPassword('');
      }
    } catch (err: any) {
      setFailedAttempts((prev) => prev + 1);
      setErrorMessage(err?.message || 'Decryption failed. Please check your Master Password.');
    } finally {
      setIsDecrypting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-4">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Unlock Your Vault
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Enter your Master Password to decrypt your stored credentials locally.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {failedAttempts > 2 && (
            <p className="text-[11px] text-amber-400 bg-amber-500/10 p-2 rounded border border-amber-500/20 text-center">
              Multiple failed unlock attempts ({failedAttempts}). Throttling delay active to protect your vault.
            </p>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={masterPassword}
                onChange={(e) => setMasterPassword(e.target.value)}
                placeholder="Enter Master Password..."
                required
                autoFocus
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
          </div>

          <button
            type="submit"
            disabled={isDecrypting || !masterPassword}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            {isDecrypting ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span>Decrypting AES-256 Vault...</span>
              </>
            ) : (
              <>
                <Key className="h-5 w-5" />
                <span>Unlock Vault</span>
              </>
            )}
          </button>

          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              type="button"
              onClick={onPurgeVaultRequest}
              className="text-xs text-slate-500 hover:text-red-400 transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <AlertOctagon className="h-3.5 w-3.5" />
              <span>Forgot Master Password? Reset Vault</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
