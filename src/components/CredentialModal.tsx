import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  Globe,
  User,
  Key,
  Folder,
  FileText,
  Star,
} from 'lucide-react';
import { Credential } from '../types';
import { DEFAULT_CATEGORIES } from '../lib/storage';
import { evaluatePasswordStrength, generateSecurePassword } from '../lib/crypto';

interface CredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credData: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  credentialToEdit?: Credential | null;
}

export const CredentialModal: React.FC<CredentialModalProps> = ({
  isOpen,
  onClose,
  onSave,
  credentialToEdit,
}) => {
  const [websiteName, setWebsiteName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [category, setCategory] = useState('Personal');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (credentialToEdit) {
      setWebsiteName(credentialToEdit.websiteName);
      setWebsiteUrl(credentialToEdit.websiteUrl || '');
      setUsername(credentialToEdit.username);
      setPassword(credentialToEdit.password);
      setCategory(credentialToEdit.category || 'Personal');
      setNotes(credentialToEdit.notes || '');
      setIsFavorite(credentialToEdit.isFavorite || false);
    } else {
      setWebsiteName('');
      setWebsiteUrl('');
      setUsername('');
      setPassword('');
      setCategory('Personal');
      setNotes('');
      setIsFavorite(false);
    }
  }, [credentialToEdit, isOpen]);

  if (!isOpen) return null;

  const handleGenerateInModal = () => {
    const generated = generateSecurePassword({
      length: 18,
      useUppercase: true,
      useLowercase: true,
      useNumbers: true,
      useSymbols: true,
      excludeSimilar: true,
    });
    setPassword(generated);
    setShowPassword(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!websiteName || !username || !password) return;

    onSave({
      id: credentialToEdit?.id,
      websiteName,
      websiteUrl,
      username,
      password,
      category,
      notes,
      isFavorite,
    });
    onClose();
  };

  const strength = evaluatePasswordStrength(password);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            <span>{credentialToEdit ? 'Edit Credential' : 'Add New Password'}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {/* Website / App Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Website or App Name *
            </label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="e.g., Google, GitHub, Amazon..."
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Website URL */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Website URL (Optional)
            </label>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Username / Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Username or Email *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user@example.com"
                required
                className="w-full pl-9 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Password field with Quick Generator & Strength Meter */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Password *
              </label>
              <button
                type="button"
                onClick={handleGenerateInModal}
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Strong</span>
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Password strength mini bar */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Strength:</span>
                  <span className={`font-semibold ${strength.color.replace('bg-', 'text-')}`}>
                    {strength.rating} ({strength.score}/100)
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} transition-all`} style={{ width: `${strength.score}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEFAULT_CATEGORIES.filter((c) => c !== 'All' && c !== 'Favorites').map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Recovery codes, security question answers, 2FA info..."
              rows={2}
              className="w-full px-4 py-2 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Favorite switch */}
          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isFavorite}
              onChange={(e) => setIsFavorite(e.target.checked)}
              className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
              <Star className="h-3.5 w-3.5 text-amber-400" /> Mark as Favorite Account
            </span>
          </label>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-500/20"
            >
              {credentialToEdit ? 'Save Changes' : 'Save Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
