import React, { useState } from 'react';
import {
  Zap,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  Plus,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { evaluatePasswordStrength } from '../lib/crypto';

interface StrengthCheckerModalViewProps {
  onSavePasswordToVault: (password: string) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  copiedLabel: string | null;
}

export const StrengthCheckerModalView: React.FC<StrengthCheckerModalViewProps> = ({
  onSavePasswordToVault,
  onCopyToClipboard,
  copiedLabel,
}) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);

  const strength = evaluatePasswordStrength(inputPassword);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Password Strength Evaluator</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyze password complexity, entropy bits, pattern vulnerabilities, and crack resistance.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="mt-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400 flex items-center gap-2">
          <Info className="h-4 w-4 text-blue-400 shrink-0" />
          <span>
            Zero Storage Guarantee: Passwords evaluated here remain purely in memory and are never saved unless you explicitly click "Save to Vault".
          </span>
        </div>
      </div>

      {/* Main Evaluator Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        {/* Input box */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
            Enter or Paste Password to Test
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={inputPassword}
              onChange={(e) => setInputPassword(e.target.value)}
              placeholder="Type or paste any password..."
              className="w-full px-4 py-3.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 font-mono text-base focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all pr-28"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
              {inputPassword && (
                <button
                  type="button"
                  onClick={() => onCopyToClipboard(inputPassword, 'Evaluator Password')}
                  className="p-2 text-slate-400 hover:text-white transition-colors"
                  title="Copy Password"
                >
                  {copiedLabel === 'Evaluator Password' ? (
                    <Check className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Strength Rating Gauge */}
        <div className="p-6 bg-slate-950 border border-slate-800/80 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Rating</span>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-2xl font-extrabold ${strength.color.replace('bg-', 'text-')}`}>
                  {strength.rating}
                </span>
                <span className="text-sm text-slate-400 font-mono">({strength.score}/100)</span>
              </div>
            </div>

            {/* Quick Action Button */}
            {inputPassword && (
              <button
                onClick={() => onSavePasswordToVault(inputPassword)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 shrink-0"
              >
                <Plus className="h-4 w-4" />
                <span>Save to Vault</span>
              </button>
            )}
          </div>

          {/* Visual Progress Bar */}
          <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div
              className={`h-full ${strength.color} rounded-full transition-all duration-300`}
              style={{ width: `${Math.max(5, strength.score)}%` }}
            />
          </div>

          {/* Crack Time & Entropy Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-400 font-medium block">Estimated Crack Time</span>
                <span className="text-white font-bold text-sm">{strength.crackTimeFormatted}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-slate-400 font-medium block">Calculated Entropy</span>
                <span className="text-white font-bold text-sm">{strength.entropyBits} Bits</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings & Suggestions */}
        {strength.warnings.length > 0 && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5 text-red-400 text-sm">
              <AlertTriangle className="h-4 w-4" /> Vulnerabilities Found
            </p>
            {strength.warnings.map((w, idx) => (
              <p key={idx} className="pl-5">• {w}</p>
            ))}
          </div>
        )}

        {/* Detailed Criteria Checklist */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-slate-300">
            Security Rule Criteria Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strength.checks.map((check) => (
              <div
                key={check.id}
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-colors ${
                  check.passed
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-200'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                {check.passed ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className={`text-xs font-bold ${check.passed ? 'text-emerald-300' : 'text-slate-300'}`}>
                    {check.label}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{check.tip}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
