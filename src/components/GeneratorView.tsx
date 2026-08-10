import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Plus,
  Sliders,
  ShieldCheck,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { GeneratorOptions } from '../types';
import { generateSecurePassword, evaluatePasswordStrength } from '../lib/crypto';

interface GeneratorViewProps {
  onSavePasswordToVault: (password: string) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  copiedLabel: string | null;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({
  onSavePasswordToVault,
  onCopyToClipboard,
  copiedLabel,
}) => {
  const [options, setOptions] = useState<GeneratorOptions>({
    length: 20,
    useUppercase: true,
    useLowercase: true,
    useNumbers: true,
    useSymbols: true,
    excludeSimilar: true,
  });

  const [generatedPassword, setGeneratedPassword] = useState('');
  const [batchCandidates, setBatchCandidates] = useState<string[]>([]);

  const generate = () => {
    const main = generateSecurePassword(options);
    setGeneratedPassword(main);

    // Generate 4 additional batch options
    const candidates = Array.from({ length: 4 }, () => generateSecurePassword(options));
    setBatchCandidates(candidates);
  };

  useEffect(() => {
    generate();
  }, [options]);

  const strength = evaluatePasswordStrength(generatedPassword);

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Strong Password Generator</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Generate cryptographically unguessable passwords using standard browser CSPRNG.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Display Card */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        {/* Output Box */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
              Primary Generated Password
            </span>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${strength.color} text-slate-950`}>
                {strength.rating}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800/80 overflow-x-auto">
            <span className="font-mono text-lg sm:text-2xl font-bold tracking-wider text-white break-all">
              {generatedPassword}
            </span>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={generate}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                title="Regenerate Password"
              >
                <RefreshCw className="h-5 w-5" />
              </button>

              <button
                onClick={() => onCopyToClipboard(generatedPassword, 'Generated Password')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                {copiedLabel === 'Generated Password' ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <button
                onClick={() => onSavePasswordToVault(generatedPassword)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>Save to Vault</span>
              </button>
            </div>
          </div>

          {/* Strength Bar */}
          <div className="space-y-1">
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.score}%` }} />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Entropy: {strength.entropyBits} bits</span>
              <span>Crack time: {strength.crackTimeFormatted}</span>
            </div>
          </div>
        </div>

        {/* Configuration Controls */}
        <div className="space-y-5 pt-2">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="h-4 w-4 text-blue-400" />
            <span>Customize Settings</span>
          </h3>

          {/* Length Slider */}
          <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-300 uppercase">Password Length</span>
              <span className="font-mono font-bold text-base text-blue-400">{options.length} Characters</span>
            </div>
            <input
              type="range"
              min={8}
              max={64}
              value={options.length}
              onChange={(e) => setOptions({ ...options, length: parseInt(e.target.value, 10) })}
              className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>8 chars</span>
              <span>20 chars (Recommended)</span>
              <span>64 chars</span>
            </div>
          </div>

          {/* Character Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Uppercase Letters</span>
                <span className="text-[11px] font-mono text-slate-500">A, B, C, D...</span>
              </div>
              <input
                type="checkbox"
                checked={options.useUppercase}
                onChange={(e) => setOptions({ ...options, useUppercase: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </label>

            <label className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Lowercase Letters</span>
                <span className="text-[11px] font-mono text-slate-500">a, b, c, d...</span>
              </div>
              <input
                type="checkbox"
                checked={options.useLowercase}
                onChange={(e) => setOptions({ ...options, useLowercase: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </label>

            <label className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Numbers</span>
                <span className="text-[11px] font-mono text-slate-500">0, 1, 2, 3, 4...</span>
              </div>
              <input
                type="checkbox"
                checked={options.useNumbers}
                onChange={(e) => setOptions({ ...options, useNumbers: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </label>

            <label className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Special Symbols</span>
                <span className="text-[11px] font-mono text-slate-500">!, @, #, $, %, &...</span>
              </div>
              <input
                type="checkbox"
                checked={options.useSymbols}
                onChange={(e) => setOptions({ ...options, useSymbols: e.target.checked })}
                className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
            </label>
          </div>

          <label className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between cursor-pointer hover:border-slate-700 transition-colors">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Exclude Similar Characters</span>
              <span className="text-[11px] text-slate-400">Avoid confusing characters like i, l, 1, I, O, 0</span>
            </div>
            <input
              type="checkbox"
              checked={options.excludeSimilar}
              onChange={(e) => setOptions({ ...options, excludeSimilar: e.target.checked })}
              className="rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
          </label>
        </div>

        {/* Batch Options */}
        <div className="space-y-3 pt-4 border-t border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <span>Alternative Password Candidates</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {batchCandidates.map((cand, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between font-mono text-xs text-slate-200 hover:border-slate-700 transition-all"
              >
                <span className="truncate mr-2 font-semibold tracking-wider">{cand}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onCopyToClipboard(cand, `Candidate ${idx + 1}`)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Copy Password"
                  >
                    {copiedLabel === `Candidate ${idx + 1}` ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onSavePasswordToVault(cand)}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                    title="Save to Vault"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
