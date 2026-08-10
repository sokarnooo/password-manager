import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Key,
  Clock,
  ArrowRight,
  Layers,
  Lock,
} from 'lucide-react';
import { Credential } from '../types';
import { evaluatePasswordStrength } from '../lib/crypto';

interface SecurityAuditViewProps {
  credentials: Credential[];
  onSelectCredentialForEdit: (cred: Credential) => void;
  onOpenGeneratorTab: () => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  credentials,
  onSelectCredentialForEdit,
  onOpenGeneratorTab,
}) => {
  const weakItems: { cred: Credential; rating: string }[] = [];
  const oldItems: { cred: Credential; daysOld: number }[] = [];
  const reusedMap: Map<string, Credential[]> = new Map();

  credentials.forEach((c) => {
    const evalRes = evaluatePasswordStrength(c.password);
    if (evalRes.rating === 'Very Weak' || evalRes.rating === 'Weak') {
      weakItems.push({ cred: c, rating: evalRes.rating });
    }

    const ageDays = Math.round(
      (Date.now() - new Date(c.updatedAt || c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (ageDays > 180) {
      oldItems.push({ cred: c, daysOld: ageDays });
    }

    if (c.password) {
      const existing = reusedMap.get(c.password) || [];
      existing.push(c);
      reusedMap.set(c.password, existing);
    }
  });

  const reusedGroups: { passwordSnippet: string; count: number; items: Credential[] }[] = [];
  reusedMap.forEach((items, pwd) => {
    if (items.length > 1) {
      reusedGroups.push({
        passwordSnippet: pwd.substring(0, 3) + '••••' + pwd.slice(-2),
        count: items.length,
        items,
      });
    }
  });

  const totalIssues = weakItems.length + oldItems.length + reusedGroups.length;

  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Security Audit Report</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive scan for credential reuse, weak entropy, and stale passwords.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenGeneratorTab}
          className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shrink-0 flex items-center gap-1.5"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Generate Replacements</span>
        </button>
      </div>

      {/* Audit Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Weak Passwords</p>
            <p className={`text-2xl font-extrabold mt-1 ${weakItems.length > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {weakItems.length}
            </p>
          </div>
          <ShieldAlert className={`h-8 w-8 ${weakItems.length > 0 ? 'text-red-400' : 'text-emerald-400'}`} />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Reused Across Accounts</p>
            <p className={`text-2xl font-extrabold mt-1 ${reusedGroups.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {reusedGroups.length} Clusters
            </p>
          </div>
          <Layers className={`h-8 w-8 ${reusedGroups.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase">Older Than 180 Days</p>
            <p className={`text-2xl font-extrabold mt-1 ${oldItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {oldItems.length}
            </p>
          </div>
          <Clock className={`h-8 w-8 ${oldItems.length > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
        </div>
      </div>

      {/* Audit Detail Sections */}
      {totalIssues === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">Your Vault is Pristine!</h2>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Zero weak, duplicate, or stale credentials detected across all {credentials.length} saved accounts.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Weak Passwords */}
          {weakItems.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-400" />
                <h3 className="text-base font-bold text-white">Vulnerable & Weak Credentials ({weakItems.length})</h3>
              </div>

              <div className="divide-y divide-slate-800">
                {weakItems.map(({ cred, rating }) => (
                  <div key={cred.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{cred.websiteName}</p>
                      <p className="text-xs text-slate-400 font-mono">{cred.username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded border border-red-500/20">
                        {rating}
                      </span>
                      <button
                        onClick={() => onSelectCredentialForEdit(cred)}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
                      >
                        Fix Now
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 2: Reused Passwords */}
          {reusedGroups.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Reused Passwords Clusters ({reusedGroups.length})</h3>
              </div>
              <p className="text-xs text-slate-400">
                Reusing the same password across multiple sites means a breach on one site exposes all others.
              </p>

              <div className="space-y-4">
                {reusedGroups.map((group, idx) => (
                  <div key={idx} className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400">Password pattern: {group.passwordSnippet}</span>
                      <span className="font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Shared across {group.count} sites
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.items.map((cred) => (
                        <div
                          key={cred.id}
                          className="p-2.5 bg-slate-900 rounded-lg border border-slate-800/80 flex items-center justify-between text-xs"
                        >
                          <span className="font-semibold text-white truncate">{cred.websiteName}</span>
                          <button
                            onClick={() => onSelectCredentialForEdit(cred)}
                            className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            Update
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Old Passwords */}
          {oldItems.length > 0 && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Old Passwords ({oldItems.length})</h3>
              </div>
              <p className="text-xs text-slate-400">
                These credentials haven't been updated in over 6 months.
              </p>

              <div className="divide-y divide-slate-800">
                {oldItems.map(({ cred, daysOld }) => (
                  <div key={cred.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{cred.websiteName}</p>
                      <p className="text-xs text-slate-400 font-mono">{cred.username}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20 font-mono">
                        {daysOld} days old
                      </span>
                      <button
                        onClick={() => onSelectCredentialForEdit(cred)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                      >
                        Rotate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
