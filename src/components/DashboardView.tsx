import React from 'react';
import {
  Key,
  ShieldCheck,
  ShieldAlert,
  Plus,
  Zap,
  Sparkles,
  ArrowRight,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Copy,
  Check,
} from 'lucide-react';
import { Credential, ActiveTab } from '../types';
import { evaluatePasswordStrength } from '../lib/crypto';

interface DashboardViewProps {
  credentials: Credential[];
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddModal: () => void;
  onSelectCredentialForEdit: (cred: Credential) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  copiedId: string | null;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  credentials = [],
  setActiveTab,
  onOpenAddModal,
  onSelectCredentialForEdit,
  onCopyToClipboard,
  copiedId,
}) => {
  const safeCredentials = credentials || [];
  // Compute analytics
  const totalCount = safeCredentials.length;

  let weakCount = 0;
  let fairCount = 0;
  let strongCount = 0;

  const passwordsToUpdate: { cred: Credential; reason: string }[] = [];
  const passwordMap: Map<string, Credential[]> = new Map();

  safeCredentials.forEach((c) => {
    const evalRes = evaluatePasswordStrength(c.password);
    if (evalRes.rating === 'Very Weak' || evalRes.rating === 'Weak') {
      weakCount++;
      passwordsToUpdate.push({ cred: c, reason: `Weak password (${evalRes.rating})` });
    } else if (evalRes.rating === 'Fair') {
      fairCount++;
    } else {
      strongCount++;
    }

    // Check age (>180 days)
    const ageDays = (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 180 && !passwordsToUpdate.some((item) => item.cred.id === c.id)) {
      passwordsToUpdate.push({ cred: c, reason: `Old password (${Math.round(ageDays)} days old)` });
    }

    // Map passwords to check duplicates
    if (c.password) {
      const existing = passwordMap.get(c.password) || [];
      existing.push(c);
      passwordMap.set(c.password, existing);
    }
  });

  // Flag duplicate passwords
  passwordMap.forEach((group) => {
    if (group.length > 1) {
      group.forEach((cred) => {
        if (!passwordsToUpdate.some((item) => item.cred.id === cred.id)) {
          passwordsToUpdate.push({ cred, reason: `Reused across ${group.length} accounts` });
        }
      });
    }
  });

  // Security score calculation (0 to 100)
  const securityScore = totalCount === 0 ? 100 : Math.round((strongCount * 100 + fairCount * 60 + weakCount * 10) / totalCount);

  // Recent credentials sorted by creation/update
  const recentCredentials = [...credentials]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Welcome & Quick Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Vault Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time security metrics, vault health audit, and quick action shortcuts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            onClick={onOpenAddModal}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Add Password</span>
          </button>

          <button
            onClick={() => setActiveTab('checker')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/60 transition-all active:scale-95"
          >
            <Zap className="h-4 w-4 text-amber-400" />
            <span>Check Strength</span>
          </button>

          <button
            onClick={() => setActiveTab('generator')}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-sm font-semibold rounded-xl border border-slate-700/60 transition-all active:scale-95"
          >
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Generate Password</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Passwords */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Saved</p>
            <p className="text-3xl font-extrabold text-white mt-1">{totalCount}</p>
            <p className="text-xs text-slate-500 mt-1">Credentials in vault</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Key className="h-6 w-6" />
          </div>
        </div>

        {/* Security Score Gauge */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Vault Security Score</p>
            <p className={`text-3xl font-extrabold mt-1 ${
              securityScore >= 80 ? 'text-emerald-400' : securityScore >= 60 ? 'text-amber-400' : 'text-red-400'
            }`}>
              {securityScore}%
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {securityScore >= 80 ? 'Optimal strength' : 'Attention needed'}
            </p>
          </div>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${
            securityScore >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        {/* Strong Passwords */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Strong Passwords</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-1">{strongCount}</p>
            <p className="text-xs text-slate-500 mt-1">High entropy credentials</p>
          </div>
          <div className="h-12 w-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Weak Passwords Warning */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weak Passwords</p>
            <p className={`text-3xl font-extrabold mt-1 ${weakCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>
              {weakCount}
            </p>
            <p className="text-xs text-slate-500 mt-1">Vulnerable to breach</p>
          </div>
          <div className={`h-12 w-12 rounded-xl border flex items-center justify-center ${
            weakCount > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Two Column Layout: Passwords to Update vs Recently Added Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Passwords That Need Attention */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-bold text-white">Action Recommended</h3>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                {passwordsToUpdate.length} items
              </span>
            </div>

            {passwordsToUpdate.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">All passwords are strong and up-to-date!</p>
                <p className="text-xs text-slate-500">No weak or repeated credentials found in your vault.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {passwordsToUpdate.map(({ cred, reason }) => (
                  <div
                    key={cred.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-white truncate">{cred.websiteName}</p>
                      <p className="text-xs text-slate-400 truncate">{cred.username}</p>
                      <span className="inline-block mt-1 text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {reason}
                      </span>
                    </div>

                    <button
                      onClick={() => onSelectCredentialForEdit(cred)}
                      className="px-3 py-1.5 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg shrink-0 transition-colors"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {passwordsToUpdate.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-800 text-right">
              <button
                onClick={() => setActiveTab('audit')}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 inline-flex items-center gap-1"
              >
                <span>Run Full Vault Audit</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Recently Added / Updated Accounts */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Recently Added Accounts</h3>
              </div>
              <button
                onClick={() => setActiveTab('vault')}
                className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
              >
                <span>View All ({totalCount})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {recentCredentials.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Key className="h-10 w-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">Vault is empty</p>
                <p className="text-xs text-slate-500">Click "Add Password" to store your first login details.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                {recentCredentials.map((cred) => (
                  <div
                    key={cred.id}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white truncate">{cred.websiteName}</p>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {cred.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{cred.username}</p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onCopyToClipboard(cred.username, 'Username')}
                        title="Copy Username"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        {copiedId === `${cred.id}-Username` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => onCopyToClipboard(cred.password, 'Password')}
                        title="Copy Password"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        {copiedId === `${cred.id}-Password` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Key className="h-3.5 w-3.5 text-blue-400" />
                        )}
                      </button>

                      <button
                        onClick={() => onSelectCredentialForEdit(cred)}
                        className="px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg ml-1"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
