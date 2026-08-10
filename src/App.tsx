/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  EncryptedVault,
  VaultPayload,
  Credential,
  SecuritySettings,
  ActiveTab,
} from './types';
import {
  loadEncryptedVault,
  saveEncryptedVault,
  clearEncryptedVaultStorage,
  loadSecuritySettings,
  saveSecuritySettings,
  DEFAULT_CATEGORIES,
} from './lib/storage';
import {
  generateSalt,
  deriveKeyFromMasterPassword,
  encryptData,
  decryptData,
  createVerifier,
  verifyMasterKey,
} from './lib/crypto';

import { Navbar } from './components/Navbar';
import { MasterPasswordSetup } from './components/MasterPasswordSetup';
import { UnlockVault } from './components/UnlockVault';
import { DashboardView } from './components/DashboardView';
import { VaultView } from './components/VaultView';
import { CredentialModal } from './components/CredentialModal';
import { StrengthCheckerModalView } from './components/StrengthCheckerModalView';
import { GeneratorView } from './components/GeneratorView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { SettingsView } from './components/SettingsView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';

export default function App() {
  const [encryptedVault, setEncryptedVault] = useState<EncryptedVault | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultPayload, setVaultPayload] = useState<VaultPayload | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [settings, setSettings] = useState<SecuritySettings>(loadSecuritySettings);

  // Auto lock countdown state
  const [autoLockSecondsLeft, setAutoLockSecondsLeft] = useState<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Clipboard copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal dialog states
  const [isCredentialModalOpen, setIsCredentialModalOpen] = useState(false);
  const [credentialToEdit, setCredentialToEdit] = useState<Credential | null>(null);

  const [deleteModalState, setDeleteModalState] = useState<{
    isOpen: boolean;
    credToDelete: Credential | null;
    isPurgeVault?: boolean;
  }>({
    isOpen: false,
    credToDelete: null,
    isPurgeVault: false,
  });

  // Load vault from storage on mount
  useEffect(() => {
    const existing = loadEncryptedVault();
    setEncryptedVault(existing);
  }, []);

  // Sync theme
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSecuritySettings(settings);
  }, [settings]);

  // Lock vault action
  const lockVault = useCallback(() => {
    setMasterKey(null);
    setVaultPayload(null);
    setAutoLockSecondsLeft(null);
  }, []);

  // Auto lock timer & user activity listeners
  useEffect(() => {
    if (!masterKey || settings.autoLockMinutes === 0) {
      setAutoLockSecondsLeft(null);
      return;
    }

    const timeoutDuration = settings.autoLockMinutes * 60;
    setAutoLockSecondsLeft(timeoutDuration);
    lastActivityRef.current = Date.now();

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      setAutoLockSecondsLeft(timeoutDuration);
    };

    window.addEventListener('mousemove', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('click', handleUserActivity);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastActivityRef.current) / 1000);
      const remaining = timeoutDuration - elapsed;

      if (remaining <= 0) {
        lockVault();
      } else {
        setAutoLockSecondsLeft(remaining);
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      clearInterval(interval);
    };
  }, [masterKey, settings.autoLockMinutes, lockVault]);

  // Lock on window blur / tab switch if configured
  useEffect(() => {
    if (!masterKey || !settings.lockOnTabSwitch) return;

    const handleBlur = () => {
      lockVault();
    };

    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('blur', handleBlur);
    };
  }, [masterKey, settings.lockOnTabSwitch, lockVault]);

  // Handle Master Password Initialization
  const handleSetupComplete = async (masterPassword: string, initialCredentials: Credential[]) => {
    const salt = generateSalt();
    const key = await deriveKeyFromMasterPassword(masterPassword, salt);
    const verifier = await createVerifier(key);

    const initialPayload: VaultPayload = {
      credentials: initialCredentials,
      categories: DEFAULT_CATEGORIES.filter((c) => c !== 'All' && c !== 'Favorites'),
    };

    const payloadText = JSON.stringify(initialPayload);
    const encryptedData = await encryptData(payloadText, key);

    const newEncryptedVault: EncryptedVault = {
      version: 1,
      salt,
      verifierIv: verifier.iv,
      verifierCiphertext: verifier.ciphertext,
      vaultIv: encryptedData.iv,
      vaultCiphertext: encryptedData.ciphertext,
      updatedAt: new Date().toISOString(),
    };

    saveEncryptedVault(newEncryptedVault);
    setEncryptedVault(newEncryptedVault);
    setMasterKey(key);
    setVaultPayload(initialPayload);
    setActiveTab('dashboard');
  };

  // Handle Unlocking Vault
  const handleUnlock = async (masterPassword: string): Promise<boolean> => {
    if (!encryptedVault) return false;

    try {
      const candidateKey = await deriveKeyFromMasterPassword(masterPassword, encryptedVault.salt);
      const isValid = await verifyMasterKey(
        candidateKey,
        encryptedVault.verifierIv,
        encryptedVault.verifierCiphertext
      );

      if (!isValid) return false;

      const decryptedString = await decryptData(
        encryptedVault.vaultCiphertext,
        encryptedVault.vaultIv,
        candidateKey
      );

      const parsedPayload = JSON.parse(decryptedString) as VaultPayload;
      setMasterKey(candidateKey);
      setVaultPayload(parsedPayload);
      setActiveTab('dashboard');
      return true;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  };

  // Helper to persist updated payload to localStorage
  const saveUpdatedPayload = async (newPayload: VaultPayload) => {
    if (!masterKey || !encryptedVault) return;

    const payloadText = JSON.stringify(newPayload);
    const encryptedData = await encryptData(payloadText, masterKey);

    const updatedVault: EncryptedVault = {
      ...encryptedVault,
      vaultIv: encryptedData.iv,
      vaultCiphertext: encryptedData.ciphertext,
      updatedAt: new Date().toISOString(),
    };

    saveEncryptedVault(updatedVault);
    setEncryptedVault(updatedVault);
    setVaultPayload(newPayload);
  };

  // Credential CRUD Operations
  const handleSaveCredential = async (
    credData: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => {
    if (!vaultPayload) return;

    const now = new Date().toISOString();
    let updatedList = [...vaultPayload.credentials];

    if (credData.id) {
      // Edit existing
      updatedList = updatedList.map((c) =>
        c.id === credData.id
          ? {
              ...c,
              websiteName: credData.websiteName,
              websiteUrl: credData.websiteUrl,
              username: credData.username,
              password: credData.password,
              category: credData.category,
              notes: credData.notes,
              isFavorite: credData.isFavorite,
              updatedAt: now,
              lastPasswordChange: c.password !== credData.password ? now : c.lastPasswordChange,
            }
          : c
      );
    } else {
      // Create new
      const newCred: Credential = {
        id: 'cred-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        websiteName: credData.websiteName,
        websiteUrl: credData.websiteUrl,
        username: credData.username,
        password: credData.password,
        category: credData.category,
        notes: credData.notes,
        isFavorite: credData.isFavorite,
        createdAt: now,
        updatedAt: now,
        lastPasswordChange: now,
      };
      updatedList.unshift(newCred);
    }

    await saveUpdatedPayload({ ...vaultPayload, credentials: updatedList });
    setCredentialToEdit(null);
  };

  const handleDeleteCredentialConfirm = async () => {
    if (!vaultPayload || !deleteModalState.credToDelete) return;

    const updatedList = vaultPayload.credentials.filter(
      (c) => c.id !== deleteModalState.credToDelete!.id
    );

    await saveUpdatedPayload({ ...vaultPayload, credentials: updatedList });
  };

  const handleToggleFavorite = async (cred: Credential) => {
    if (!vaultPayload) return;

    const updatedList = vaultPayload.credentials.map((c) =>
      c.id === cred.id ? { ...c, isFavorite: !c.isFavorite, updatedAt: new Date().toISOString() } : c
    );

    await saveUpdatedPayload({ ...vaultPayload, credentials: updatedList });
  };

  // Master Password Change Function
  const handleChangeMasterPassword = async (
    oldPass: string,
    newPass: string
  ): Promise<boolean> => {
    if (!encryptedVault || !vaultPayload) return false;

    // Verify current master password
    const isOldValid = await handleUnlock(oldPass);
    if (!isOldValid) return false;

    // Derive new key and new salt
    const newSalt = generateSalt();
    const newKey = await deriveKeyFromMasterPassword(newPass, newSalt);
    const newVerifier = await createVerifier(newKey);

    const payloadText = JSON.stringify(vaultPayload);
    const encryptedData = await encryptData(payloadText, newKey);

    const newVaultObj: EncryptedVault = {
      version: 1,
      salt: newSalt,
      verifierIv: newVerifier.iv,
      verifierCiphertext: newVerifier.ciphertext,
      vaultIv: encryptedData.iv,
      vaultCiphertext: encryptedData.ciphertext,
      updatedAt: new Date().toISOString(),
    };

    saveEncryptedVault(newVaultObj);
    setEncryptedVault(newVaultObj);
    setMasterKey(newKey);
    return true;
  };

  // Copy to Clipboard handler
  const handleCopyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(label);

    setTimeout(() => {
      setCopiedId(null);
    }, 2500);

    // Auto-clear clipboard if configured
    if (settings.clearClipboardSeconds > 0) {
      setTimeout(() => {
        navigator.clipboard.writeText('');
      }, settings.clearClipboardSeconds * 1000);
    }
  };

  // Export Encrypted JSON file
  const handleExportEncryptedVault = () => {
    if (!encryptedVault) return;
    const jsonStr = JSON.stringify(encryptedVault, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `password-vault-backup-${new Date().toISOString().slice(0, 10)}.enc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export Plaintext CSV
  const handleExportPlaintextCSV = () => {
    if (!vaultPayload) return;
    let csv = 'Website,URL,Username,Password,Category,Notes,Created\n';
    vaultPayload.credentials.forEach((c) => {
      const escape = (val?: string) => `"${(val || '').replace(/"/g, '""')}"`;
      csv += `${escape(c.websiteName)},${escape(c.websiteUrl)},${escape(c.username)},${escape(c.password)},${escape(c.category)},${escape(c.notes)},${escape(c.createdAt)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `passwords-export-UNENCRYPTED-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON backup
  const handleImportVaultJSON = async (jsonString: string) => {
    if (!vaultPayload) return;
    try {
      const parsed = JSON.parse(jsonString);
      let importedCredentials: Credential[] = [];

      if (Array.isArray(parsed)) {
        importedCredentials = parsed;
      } else if (parsed.credentials && Array.isArray(parsed.credentials)) {
        importedCredentials = parsed.credentials;
      }

      const merged = [...importedCredentials, ...vaultPayload.credentials];
      // Deduplicate by websiteName + username
      const uniqueMap = new Map<string, Credential>();
      merged.forEach((item) => {
        const key = `${item.websiteName}-${item.username}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const updatedList = Array.from(uniqueMap.values());
      await saveUpdatedPayload({ ...vaultPayload, credentials: updatedList });
    } catch (e) {
      console.error('Import error:', e);
      throw new Error('Failed to parse backup JSON structure.');
    }
  };

  // Purge entire vault
  const handlePurgeVaultConfirm = () => {
    clearEncryptedVaultStorage();
    setEncryptedVault(null);
    setMasterKey(null);
    setVaultPayload(null);
  };

  // RENDER STATES

  // State 1: No vault exists -> Master Password Setup
  if (!encryptedVault) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        <MasterPasswordSetup onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  // State 2: Vault exists, but locked -> Unlock Screen
  if (!masterKey || !vaultPayload) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
        <UnlockVault
          onUnlock={handleUnlock}
          onPurgeVaultRequest={() =>
            setDeleteModalState({
              isOpen: true,
              credToDelete: null,
              isPurgeVault: true,
            })
          }
        />

        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen && deleteModalState.isPurgeVault === true}
          onClose={() => setDeleteModalState({ isOpen: false, credToDelete: null, isPurgeVault: false })}
          onConfirm={handlePurgeVaultConfirm}
          title="Permanently Purge Vault?"
          description="This action erases all encrypted credentials from local storage. Without your Master Password, this data is already unrecoverable."
          confirmText="Erase All Vault Data"
        />
      </div>
    );
  }

  // State 3: Vault Unlocked -> Main Application Layout
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-500 selection:text-white flex flex-col">
      {/* Header / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isUnlocked={true}
        onLockVault={lockVault}
        onOpenAddModal={() => {
          setCredentialToEdit(null);
          setIsCredentialModalOpen(true);
        }}
        autoLockSecondsLeft={autoLockSecondsLeft}
        settings={settings}
        onUpdateSettings={setSettings}
        vaultItemCount={vaultPayload.credentials.length}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            credentials={vaultPayload.credentials}
            setActiveTab={setActiveTab}
            onOpenAddModal={() => {
              setCredentialToEdit(null);
              setIsCredentialModalOpen(true);
            }}
            onSelectCredentialForEdit={(cred) => {
              setCredentialToEdit(cred);
              setIsCredentialModalOpen(true);
            }}
            onCopyToClipboard={handleCopyToClipboard}
            copiedId={copiedId}
          />
        )}

        {activeTab === 'vault' && (
          <VaultView
            credentials={vaultPayload.credentials}
            onOpenAddModal={() => {
              setCredentialToEdit(null);
              setIsCredentialModalOpen(true);
            }}
            onEditCredential={(cred) => {
              setCredentialToEdit(cred);
              setIsCredentialModalOpen(true);
            }}
            onDeleteCredential={(cred) => {
              setDeleteModalState({
                isOpen: true,
                credToDelete: cred,
                isPurgeVault: false,
              });
            }}
            onToggleFavorite={handleToggleFavorite}
            onCopyToClipboard={handleCopyToClipboard}
            copiedId={copiedId}
          />
        )}

        {activeTab === 'checker' && (
          <StrengthCheckerModalView
            onSavePasswordToVault={(pass) => {
              setCredentialToEdit({
                id: '',
                websiteName: '',
                websiteUrl: '',
                username: '',
                password: pass,
                category: 'Personal',
                createdAt: '',
                updatedAt: '',
              });
              setIsCredentialModalOpen(true);
            }}
            onCopyToClipboard={handleCopyToClipboard}
            copiedLabel={copiedId}
          />
        )}

        {activeTab === 'generator' && (
          <GeneratorView
            onSavePasswordToVault={(pass) => {
              setCredentialToEdit({
                id: '',
                websiteName: '',
                websiteUrl: '',
                username: '',
                password: pass,
                category: 'Personal',
                createdAt: '',
                updatedAt: '',
              });
              setIsCredentialModalOpen(true);
            }}
            onCopyToClipboard={handleCopyToClipboard}
            copiedLabel={copiedId}
          />
        )}

        {activeTab === 'audit' && (
          <SecurityAuditView
            credentials={vaultPayload.credentials}
            onSelectCredentialForEdit={(cred) => {
              setCredentialToEdit(cred);
              setIsCredentialModalOpen(true);
            }}
            onOpenGeneratorTab={() => setActiveTab('generator')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={setSettings}
            onChangeMasterPassword={handleChangeMasterPassword}
            onExportEncryptedVault={handleExportEncryptedVault}
            onExportPlaintextCSV={handleExportPlaintextCSV}
            onImportVaultJSON={handleImportVaultJSON}
            onPurgeVaultRequest={() =>
              setDeleteModalState({
                isOpen: true,
                credToDelete: null,
                isPurgeVault: true,
              })
            }
            credentialsCount={vaultPayload.credentials.length}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Zero-Knowledge AES-256-GCM Password Manager • Client-side WebCrypto Security</p>
          <p className="font-mono text-[11px] text-slate-600">PBKDF2-SHA256 • 600,000 Key Iterations</p>
        </div>
      </footer>

      {/* Add / Edit Credential Dialog */}
      <CredentialModal
        isOpen={isCredentialModalOpen}
        onClose={() => {
          setIsCredentialModalOpen(false);
          setCredentialToEdit(null);
        }}
        onSave={handleSaveCredential}
        credentialToEdit={credentialToEdit}
      />

      {/* Delete / Purge Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({ isOpen: false, credToDelete: null, isPurgeVault: false })}
        onConfirm={() => {
          if (deleteModalState.isPurgeVault) {
            handlePurgeVaultConfirm();
          } else {
            handleDeleteCredentialConfirm();
          }
        }}
        title={
          deleteModalState.isPurgeVault
            ? 'Purge Entire Vault?'
            : `Delete "${deleteModalState.credToDelete?.websiteName || 'Credential'}"?`
        }
        description={
          deleteModalState.isPurgeVault
            ? 'This will permanently delete all encrypted password records from local storage. This action cannot be undone.'
            : 'Are you sure you want to delete this account from your password vault?'
        }
        confirmText={deleteModalState.isPurgeVault ? 'Purge Vault' : 'Delete'}
      />
    </div>
  );
}
