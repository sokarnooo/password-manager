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
import { UnlockVault } from './components/UnlockVault';
import { DashboardView } from './components/DashboardView';
import { VaultView } from './components/VaultView';
import { CredentialModal } from './components/CredentialModal';
import { StrengthCheckerModalView } from './components/StrengthCheckerModalView';
import { GeneratorView } from './components/GeneratorView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { SettingsView } from './components/SettingsView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';
import { Lock } from 'lucide-react';
import { auth, onAuthStateChanged, User } from './lib/firebase';
import {
  saveVaultToFirestore,
  fetchVaultFromFirestore,
  logoutUser,
} from './lib/authService';

export default function App() {
  const [encryptedVault, setEncryptedVault] = useState<EncryptedVault | null>(null);
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [vaultPayload, setVaultPayload] = useState<VaultPayload | null>(null);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [settings, setSettings] = useState<SecuritySettings>(loadSecuritySettings);

  // Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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

  // Load local vault from storage on mount
  useEffect(() => {
    const existing = loadEncryptedVault();
    setEncryptedVault(existing);
  }, []);

  // Listen for Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        // Fetch remote vault from Firestore
        const remoteVault = await fetchVaultFromFirestore(user.uid);
        if (remoteVault) {
          saveEncryptedVault(remoteVault);
          setEncryptedVault(remoteVault);
        } else {
          // If user has local encryptedVault, push to Firestore
          const localVault = loadEncryptedVault();
          if (localVault) {
            await saveVaultToFirestore(user.uid, localVault);
          }
        }
      }
    });

    return () => unsubscribe();
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

    if (currentUser) {
      await saveVaultToFirestore(currentUser.uid, newEncryptedVault);
    }
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

  // Helper to persist updated payload to localStorage and Firestore
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

    if (currentUser) {
      await saveVaultToFirestore(currentUser.uid, updatedVault);
    }
  };

  // Auth Callbacks
  const handleAuthSuccess = async (user: User, masterPasswordUsed?: string) => {
    setCurrentUser(user);
    setIsAuthModalOpen(false);

    // Fetch remote vault for the user
    const remoteVault = await fetchVaultFromFirestore(user.uid);
    if (remoteVault) {
      saveEncryptedVault(remoteVault);
      setEncryptedVault(remoteVault);

      if (masterPasswordUsed) {
        // Automatically attempt to unlock with master password
        try {
          const candidateKey = await deriveKeyFromMasterPassword(masterPasswordUsed, remoteVault.salt);
          const isValid = await verifyMasterKey(
            candidateKey,
            remoteVault.verifierIv,
            remoteVault.verifierCiphertext
          );
          if (isValid) {
            const decryptedString = await decryptData(
              remoteVault.vaultCiphertext,
              remoteVault.vaultIv,
              candidateKey
            );
            const parsedPayload = JSON.parse(decryptedString) as VaultPayload;
            setMasterKey(candidateKey);
            setVaultPayload(parsedPayload);
            setActiveTab('dashboard');
          }
        } catch (e) {
          console.error('Auto-unlock after auth failed:', e);
        }
      }
    } else if (masterPasswordUsed && !encryptedVault) {
      // Create new vault for user with master password
      await handleSetupComplete(masterPasswordUsed, []);
    } else if (encryptedVault) {
      // Sync local vault up to user's new cloud profile
      await saveVaultToFirestore(user.uid, encryptedVault);
    }
  };

  const handleSignOut = async () => {
    await logoutUser();
    setCurrentUser(null);
    setMasterKey(null);
    setVaultPayload(null);
    setIsOfflineMode(false);
    setIsAuthModalOpen(false);
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

  // State 1: Unauthenticated Visitor Landing Page -> Sign In / Sign Up Card
  if (!currentUser && !isOfflineMode && (!masterKey || !vaultPayload)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUnlocked={false}
          onLockVault={lockVault}
          onOpenAddModal={() => {}}
          autoLockSecondsLeft={null}
          settings={settings}
          onUpdateSettings={setSettings}
          vaultItemCount={0}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-4">
          <AuthModal
            currentUser={currentUser}
            onAuthSuccess={handleAuthSuccess}
            onLogout={handleSignOut}
            onContinueOffline={() => setIsOfflineMode(true)}
            isInline={true}
          />
        </div>
        <Footer />
      </div>
    );
  }

  // State 2: Authenticated / Offline, but no vault initialized yet -> Prompt for Master Password Setup
  if (!encryptedVault) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUnlocked={false}
          onLockVault={lockVault}
          onOpenAddModal={() => {}}
          autoLockSecondsLeft={null}
          settings={settings}
          onUpdateSettings={setSettings}
          vaultItemCount={0}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-10 px-4">
          <div className="max-w-md w-full p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-4 text-center">
            <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {currentUser ? 'Complete Account Setup' : 'Create Local Vault'}
            </h2>
            <p className="text-xs text-slate-400">
              {currentUser
                ? `Logged in as ${currentUser.email || currentUser.displayName}. Set a Master Password to encrypt your zero-knowledge vault.`
                : 'Set a Master Password to create and encrypt your local zero-knowledge vault.'}
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const passwordInput = form.elements.namedItem('masterPassword') as HTMLInputElement;
                if (passwordInput && passwordInput.value.trim().length >= 8) {
                  handleSetupComplete(passwordInput.value.trim(), []);
                }
              }}
              className="space-y-4 text-left pt-2"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Master Password
                </label>
                <input
                  name="masterPassword"
                  type="password"
                  placeholder="Choose a strong master password..."
                  required
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-md cursor-pointer"
              >
                Create Zero-Knowledge Vault
              </button>
            </form>
            {!currentUser && (
              <button
                type="button"
                onClick={() => setIsOfflineMode(false)}
                className="text-xs text-blue-400 hover:text-blue-300 pt-2 transition-colors cursor-pointer"
              >
                ← Return to Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // State 3: Vault exists, but locked -> Unlock Screen
  if (!masterKey || !vaultPayload) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUnlocked={false}
          onLockVault={lockVault}
          onOpenAddModal={() => {}}
          autoLockSecondsLeft={null}
          settings={settings}
          onUpdateSettings={setSettings}
          vaultItemCount={0}
          currentUser={currentUser}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={handleSignOut}
        />
        <div className="flex-1 flex flex-col items-center justify-center py-6 px-4">
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
          {!currentUser && (
            <button
              onClick={() => setIsOfflineMode(false)}
              className="mt-4 text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
            >
              ← Back to Sign In / Cloud Account
            </button>
          )}
        </div>

        <DeleteConfirmModal
          isOpen={deleteModalState.isOpen && deleteModalState.isPurgeVault === true}
          onClose={() => setDeleteModalState({ isOpen: false, credToDelete: null, isPurgeVault: false })}
          onConfirm={handlePurgeVaultConfirm}
          title="Permanently Purge Vault?"
          description="This action erases all encrypted credentials from local storage. Without your Master Password, this data is already unrecoverable."
          confirmText="Erase All Vault Data"
        />

        {isAuthModalOpen && (
          <AuthModal
            currentUser={currentUser}
            onAuthSuccess={handleAuthSuccess}
            onLogout={handleSignOut}
            onClose={() => setIsAuthModalOpen(false)}
          />
        )}
        <Footer />
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
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
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
      <Footer />

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
      {/* Auth Modal */}
      {isAuthModalOpen && (
        <AuthModal
          currentUser={currentUser}
          onAuthSuccess={handleAuthSuccess}
          onLogout={handleSignOut}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}
    </div>
  );
}
