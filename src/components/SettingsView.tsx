import React, { useState } from 'react';
import {
  Sliders,
  Lock,
  Clock,
  Download,
  Upload,
  Key,
  ShieldAlert,
  Check,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { SecuritySettings, Credential } from '../types';
import { evaluatePasswordStrength } from '../lib/crypto';

interface SettingsViewProps {
  settings: SecuritySettings;
  onUpdateSettings: (settings: SecuritySettings) => void;
  onChangeMasterPassword: (oldPass: string, newPass: string) => Promise<boolean>;
  onExportEncryptedVault: () => void;
  onExportPlaintextCSV: () => void;
  onImportVaultJSON: (jsonString: string) => void;
  onPurgeVaultRequest: () => void;
  credentialsCount: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onChangeMasterPassword,
  onExportEncryptedVault,
  onExportPlaintextCSV,
  onImportVaultJSON,
  onPurgeVaultRequest,
  credentialsCount,
}) => {
  // Master password change state
  const [oldMasterPass, setOldMasterPass] = useState('');
  const [newMasterPass, setNewMasterPass] = useState('');
  const [confirmNewMasterPass, setConfirmNewMasterPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [changePassSuccess, setChangePassSuccess] = useState(false);
  const [changePassError, setChangePassError] = useState('');

  // Import state
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);

  const newPassStrength = evaluatePasswordStrength(newMasterPass);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess(false);

    if (!oldMasterPass || !newMasterPass) return;
    if (newMasterPass !== confirmNewMasterPass) {
      setChangePassError('New passwords do not match.');
      return;
    }

    if (newPassStrength.score < 40) {
      setChangePassError('Please choose a stronger master password.');
      return;
    }

    try {
      setIsChangingPass(true);
      const success = await onChangeMasterPassword(oldMasterPass, newMasterPass);
      if (success) {
        setChangePassSuccess(true);
        setOldMasterPass('');
        setNewMasterPass('');
        setConfirmNewMasterPass('');
      } else {
        setChangePassError('Current Master Password is incorrect.');
      }
    } catch (err: any) {
      setChangePassError(err?.message || 'Failed to re-encrypt vault.');
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        onImportVaultJSON(text);
        setImportSuccess(true);
        setImportError('');
      } catch (err: any) {
        setImportError('Invalid backup file format: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Vault Settings & Security</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure master key rotation, backups, and clipboard auto-clearing.
            </p>
          </div>
        </div>
      </div>

      {/* Clipboard Settings */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-400" />
          <span>Clipboard Security</span>
        </h2>

        <div className="max-w-md space-y-2">
          <label className="block text-xs font-semibold text-slate-300 uppercase">
            Clipboard Auto-Clear Timer
          </label>
          <select
            value={settings.clearClipboardSeconds}
            onChange={(e) =>
              onUpdateSettings({ ...settings, clearClipboardSeconds: parseInt(e.target.value, 10) })
            }
            className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 Seconds</option>
            <option value={30}>30 Seconds (Recommended)</option>
            <option value={60}>60 Seconds</option>
            <option value={0}>Disabled</option>
          </select>
          <p className="text-[11px] text-slate-500">
            Erases copied passwords from system clipboard after the timeout.
          </p>
        </div>
      </div>

      {/* Change Master Password */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Key className="h-5 w-5 text-blue-400" />
          <span>Rotate Master Password</span>
        </h2>
        <p className="text-xs text-slate-400">
          Re-encrypts all vault entries under a newly derived AES-256 key.
        </p>

        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-lg">
          {changePassError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />
              <span>{changePassError}</span>
            </div>
          )}

          {changePassSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Master Password updated successfully! Vault re-encrypted.</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              Current Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={oldMasterPass}
                onChange={(e) => setOldMasterPass(e.target.value)}
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              New Master Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newMasterPass}
              onChange={(e) => setNewMasterPass(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {newMasterPass && (
              <div className="mt-1 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">Strength:</span>
                  <span className={`font-semibold ${newPassStrength.color.replace('bg-', 'text-')}`}>
                    {newPassStrength.rating}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full ${newPassStrength.color}`} style={{ width: `${newPassStrength.score}%` }} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              Confirm New Master Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmNewMasterPass}
              onChange={(e) => setConfirmNewMasterPass(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isChangingPass || !oldMasterPass || !newMasterPass || newMasterPass !== confirmNewMasterPass}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-md flex items-center gap-2"
          >
            {isChangingPass ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Re-encrypting Vault...</span>
              </>
            ) : (
              <span>Update Master Password</span>
            )}
          </button>
        </form>
      </div>

      {/* Export & Import Backups */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Download className="h-5 w-5 text-blue-400" />
          <span>Backup & Export / Import Vault</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Export encrypted JSON */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="h-4 w-4 text-blue-400" />
              <span>Export Encrypted Vault</span>
            </h3>
            <p className="text-xs text-slate-400">
              Download a ciphertext JSON file ({credentialsCount} items). Requires master password to open later.
            </p>
            <button
              onClick={onExportEncryptedVault}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl"
            >
              Download .enc Backup
            </button>
          </div>

          {/* Export Unencrypted CSV */}
          <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span>Export Unencrypted CSV</span>
            </h3>
            <p className="text-xs text-slate-400">
              Exports plain text credentials for migration. Keep this file strictly private!
            </p>
            <button
              onClick={onExportPlaintextCSV}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-semibold rounded-xl"
            >
              Export Plaintext CSV
            </button>
          </div>
        </div>

        {/* Import Backup */}
        <div className="p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-400" />
            <span>Import Credentials from Backup JSON</span>
          </h3>
          <p className="text-xs text-slate-400">
            Upload an exported vault file to merge credentials into your active vault.
          </p>

          {importSuccess && (
            <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Check className="h-4 w-4" /> Import successful! Credentials merged.
            </p>
          )}

          {importError && <p className="text-xs text-red-400 font-semibold">{importError}</p>}

          <input
            type="file"
            accept=".json,.enc"
            onChange={handleFileUpload}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
          />
        </div>
      </div>

      {/* Danger Zone: Reset Vault */}
      <div className="bg-slate-900/90 border border-red-500/30 p-6 sm:p-8 rounded-2xl shadow-xl space-y-4">
        <h2 className="text-base font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-red-400" />
          <span>Danger Zone</span>
        </h2>
        <p className="text-xs text-slate-400">
          Permanently delete all stored vault items and clear local encryption keys.
        </p>
        <button
          onClick={onPurgeVaultRequest}
          className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 text-xs font-semibold rounded-xl transition-all"
        >
          Purge & Delete Entire Vault
        </button>
      </div>
    </div>
  );
};
