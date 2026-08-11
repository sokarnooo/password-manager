import React from 'react';
import {
  Lock,
  ShieldCheck,
  Key,
  Sliders,
  Plus,
  Moon,
  Sun,
  Clock,
  Sparkles,
  BarChart2,
  Zap,
  UserCheck,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-react';
import { ActiveTab, SecuritySettings } from '../types';
import { User } from '../lib/firebase';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUnlocked: boolean;
  onLockVault: () => void;
  onOpenAddModal: () => void;
  autoLockSecondsLeft: number | null;
  settings: SecuritySettings;
  onUpdateSettings: (settings: SecuritySettings) => void;
  vaultItemCount: number;
  currentUser: User | null;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  isUnlocked,
  onLockVault,
  onOpenAddModal,
  autoLockSecondsLeft,
  settings,
  onUpdateSettings,
  vaultItemCount,
  currentUser,
  onOpenAuthModal,
  onSignOut,
}) => {
  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    onUpdateSettings({ ...settings, theme: nextTheme });
  };

  const formatLockTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-slate-900/80 dark:bg-slate-950/80 border-b border-slate-800 text-slate-100 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-300 bg-clip-text text-transparent">
                Password Vault
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                AES-256
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Zero-Knowledge Encrypted Storage</p>
          </div>
        </div>

        {/* Navigation links if unlocked */}
        {isUnlocked && (
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1.5 rounded-xl border border-slate-700/50">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart2 className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('vault')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vault'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Key className="h-4 w-4" />
              <span>Vault</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[11px] bg-slate-900/60 text-slate-300 font-mono">
                {vaultItemCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('checker')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'checker'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Zap className="h-4 w-4" />
              <span>Strength Evaluator</span>
            </button>

            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'generator'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>Generator</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Audit</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>Settings</span>
            </button>
          </nav>
        )}

        {/* Quick action buttons & Lock Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* User Account / Auth Button */}
          {currentUser ? (
            <button
              onClick={onOpenAuthModal}
              title={`Logged in as ${currentUser.email || currentUser.displayName}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-all group"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-5 h-5 rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Cloud className="h-3.5 w-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline max-w-[120px] truncate">
                {currentUser.displayName || currentUser.email}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-medium transition-all"
            >
              <LogIn className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Sign In / Sync</span>
            </button>
          )}

          {isUnlocked && (
            <button
              onClick={onOpenAddModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-md transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Password</span>
            </button>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${settings.theme === 'dark' ? 'Light' : 'Dark'} mode`}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
          >
            {settings.theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-300" />
            )}
          </button>

          {/* Logout Button */}
          {isUnlocked && (
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs sm:text-sm font-medium transition-all cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile nav bar */}
      {isUnlocked && (
        <div className="md:hidden flex items-center justify-around border-t border-slate-800 px-2 py-2 bg-slate-950/90 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'dashboard' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'vault' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Key className="h-4 w-4" />
            <span>Vault ({vaultItemCount})</span>
          </button>
          <button
            onClick={() => setActiveTab('checker')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'checker' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span>Checker</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'generator' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Generator</span>
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'audit' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Audit</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center gap-1 px-2 py-1 rounded ${
              activeTab === 'settings' ? 'text-blue-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Settings</span>
          </button>
        </div>
      )}
    </header>
  );
};
