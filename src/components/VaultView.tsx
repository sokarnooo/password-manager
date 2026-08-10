import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  Copy,
  Check,
  Edit3,
  Trash2,
  ExternalLink,
  Star,
  Filter,
  Grid,
  List,
  AlertTriangle,
  Folder,
  Tag,
  Key,
  ShieldAlert,
} from 'lucide-react';
import { Credential } from '../types';
import { DEFAULT_CATEGORIES } from '../lib/storage';
import { evaluatePasswordStrength } from '../lib/crypto';

interface VaultViewProps {
  credentials: Credential[];
  onOpenAddModal: () => void;
  onEditCredential: (cred: Credential) => void;
  onDeleteCredential: (cred: Credential) => void;
  onToggleFavorite: (cred: Credential) => void;
  onCopyToClipboard: (text: string, label: string) => void;
  copiedId: string | null;
}

export const VaultView: React.FC<VaultViewProps> = ({
  credentials,
  onOpenAddModal,
  onEditCredential,
  onDeleteCredential,
  onToggleFavorite,
  onCopyToClipboard,
  copiedId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'date-new' | 'date-old'>('name-asc');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});

  const togglePasswordVisibility = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter & Sort credentials
  const filteredCredentials = useMemo(() => {
    return credentials
      .filter((item) => {
        // Category filter
        if (selectedCategory === 'Favorites' && !item.isFavorite) return false;
        if (selectedCategory !== 'All' && selectedCategory !== 'Favorites' && item.category !== selectedCategory) {
          return false;
        }

        // Search filter
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          item.websiteName.toLowerCase().includes(q) ||
          item.username.toLowerCase().includes(q) ||
          (item.websiteUrl && item.websiteUrl.toLowerCase().includes(q)) ||
          (item.notes && item.notes.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'name-asc') return a.websiteName.localeCompare(b.websiteName);
        if (sortBy === 'name-desc') return b.websiteName.localeCompare(a.websiteName);
        if (sortBy === 'date-new') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        if (sortBy === 'date-old') return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        return 0;
      });
  }, [credentials, selectedCategory, searchTerm, sortBy]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Password Vault</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              {filteredCredentials.length} / {credentials.length} items
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage and access your AES-256 encrypted account logins.</p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>Add Credential</span>
        </button>
      </div>

      {/* Controls Bar: Search, Category Pills, View Mode, Sort */}
      <div className="space-y-4 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-lg">
        {/* Search & Sort Row */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search input */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search website name, URL, username, or notes..."
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name-asc">Sort: Name (A-Z)</option>
              <option value="name-desc">Sort: Name (Z-A)</option>
              <option value="date-new">Sort: Modified (Newest)</option>
              <option value="date-old">Sort: Modified (Oldest)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-700/80">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Grid View"
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === 'table' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="List/Table View"
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat === 'Favorites' && <Star className="h-3 w-3 inline mr-1 text-amber-400 fill-amber-400" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredCredentials.length === 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-4">
          <div className="h-16 w-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500">
            <Key className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-white">No accounts found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedCategory !== 'All'
              ? 'No matching credentials for your search filters. Try clearing your search.'
              : 'Your vault is empty. Add your first credential to get started.'}
          </p>
          <button
            onClick={onOpenAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Credential</span>
          </button>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredCredentials.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCredentials.map((cred) => {
            const isRevealed = revealedPasswords[cred.id] || false;
            const evalRes = evaluatePasswordStrength(cred.password);

            return (
              <div
                key={cred.id}
                className="bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 p-5 rounded-2xl shadow-lg transition-all flex flex-col justify-between space-y-4 group"
              >
                {/* Top header: Website & Favorite & Category */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white truncate">{cred.websiteName}</h3>
                        {cred.websiteUrl && (
                          <a
                            href={cred.websiteUrl.startsWith('http') ? cred.websiteUrl : `https://${cred.websiteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-blue-400 transition-colors shrink-0"
                            title="Open Website"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                      <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {cred.category}
                      </span>
                    </div>

                    <button
                      onClick={() => onToggleFavorite(cred)}
                      title={cred.isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 transition-colors"
                    >
                      <Star
                        className={`h-4 w-4 ${
                          cred.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-500'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Username row */}
                  <div className="mt-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] text-slate-500 uppercase block font-semibold">Username / Email</span>
                      <span className="text-slate-200 font-mono text-xs truncate block">{cred.username}</span>
                    </div>
                    <button
                      onClick={() => onCopyToClipboard(cred.username, 'Username')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors shrink-0 ml-2"
                      title="Copy Username"
                    >
                      {copiedId === `${cred.id}-Username` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Password row */}
                  <div className="mt-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Password</span>
                        <span className={`text-[10px] font-bold px-1.5 rounded ${evalRes.color} text-slate-950`}>
                          {evalRes.rating}
                        </span>
                      </div>
                      <p className="font-mono text-xs text-white truncate mt-0.5 tracking-wider">
                        {isRevealed ? cred.password : '••••••••••••••••'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => togglePasswordVisibility(cred.id)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title={isRevealed ? 'Hide Password' : 'Reveal Password'}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        onClick={() => onCopyToClipboard(cred.password, 'Password')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Copy Password"
                      >
                        {copiedId === `${cred.id}-Password` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Optional notes */}
                  {cred.notes && (
                    <p className="mt-2 text-xs text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800/40 line-clamp-2">
                      {cred.notes}
                    </p>
                  )}
                </div>

                {/* Footer action icons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>Modified {new Date(cred.updatedAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditCredential(cred)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-blue-400 transition-colors"
                      title="Edit Credential"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteCredential(cred)}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
                      title="Delete Credential"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table / List View */}
      {viewMode === 'table' && filteredCredentials.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Account / URL</th>
                <th className="p-4">Category</th>
                <th className="p-4">Username</th>
                <th className="p-4">Password</th>
                <th className="p-4">Strength</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCredentials.map((cred) => {
                const isRevealed = revealedPasswords[cred.id] || false;
                const evalRes = evaluatePasswordStrength(cred.password);

                return (
                  <tr key={cred.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => onToggleFavorite(cred)}>
                          <Star
                            className={`h-3.5 w-3.5 ${
                              cred.isFavorite ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                            }`}
                          />
                        </button>
                        <span className="font-bold text-white text-sm">{cred.websiteName}</span>
                      </div>
                      {cred.websiteUrl && (
                        <span className="text-[11px] text-slate-500 block truncate max-w-[180px]">
                          {cred.websiteUrl}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {cred.category}
                      </span>
                    </td>

                    <td className="p-4 font-mono text-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[150px]">{cred.username}</span>
                        <button
                          onClick={() => onCopyToClipboard(cred.username, 'Username')}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400"
                          title="Copy Username"
                        >
                          {copiedId === `${cred.id}-Username` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="tracking-wider text-slate-200">
                          {isRevealed ? cred.password : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => togglePasswordVisibility(cred.id)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400"
                        >
                          {isRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </button>
                        <button
                          onClick={() => onCopyToClipboard(cred.password, 'Password')}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400"
                        >
                          {copiedId === `${cred.id}-Password` ? (
                            <Check className="h-3 w-3 text-emerald-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${evalRes.color} text-slate-950`}>
                        {evalRes.rating}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditCredential(cred)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-blue-400 rounded-lg"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteCredential(cred)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-red-400 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
