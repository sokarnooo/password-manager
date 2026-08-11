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
  saveSessionPassword,
  getSessionPassword,
  clearSessionPassword,
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
  const [isAuthLoading, setIsAuthLoading] = useState(true);
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

  // Helper to unlock using an explicit EncryptedVault object
  const unlockWithVaultObject = async (
    vault: EncryptedVault,
    pass: string
  ): Promise<boolean> => {
    try {
      const candidateKey = await deriveKeyFromMasterPassword(pass, vault.salt);
      const isValid = await verifyMasterKey(
        candidateKey,
        vault.verifierIv,
        vault.verifierCiphertext
      );

      if (!isValid) return false;

      const decryptedString = await decryptData(
        vault.vaultCiphertext,
        vault.vaultIv,
        candidateKey
      );

      const parsedPayload = JSON.parse(decryptedString) as VaultPayload;
      saveSessionPassword(pass);
      setMasterKey(candidateKey);
      setVaultPayload(parsedPayload);
      setActiveTab('dashboard');
      return true;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  };

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
        const effectivePass = getSessionPassword() || (user.uid + '_aegis_master_key');
        saveSessionPassword(effectivePass);

        let remoteVault = await fetchVaultFromFirestore(user.uid);
        if (!remoteVault) {
          const localVault = loadEncryptedVault();
          if (localVault) {
            remoteVault = localVault;
            await saveVaultToFirestore(user.uid, localVault);
          }
        }

        if (remoteVault) {
          setEncryptedVault(remoteVault);
          saveEncryptedVault(remoteVault);
          const unlocked = await unlockWithVaultObject(remoteVault, effectivePass);
          if (!unlocked) {
            await handleSetupComplete(effectivePass, []);
          }
        } else {
          await handleSetupComplete(effectivePass, []);
        }
      } else {
        setMasterKey(null);
        setVaultPayload(null);
        setEncryptedVault(null);
      }
      setIsAuthLoading(false);
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
    clearSessionPassword();
  }, []);

  // Handle Master Password Initialization
  const handleSetupComplete = async (masterPassword: string, initialCredentials: Credential[]) => {
    saveSessionPassword(masterPassword);
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
    return unlockWithVaultObject(encryptedVault, masterPassword);
  };

  // Auto-restore offline session if active
  useEffect(() => {
    if (isOfflineMode && !masterKey && !vaultPayload) {
      const defaultPass = 'offline_local_master_key';
      if (encryptedVault) {
        unlockWithVaultObject(encryptedVault, defaultPass).then((unlocked) => {
          if (!unlocked) {
            handleSetupComplete(defaultPass, []);
          }
        });
      } else {
        handleSetupComplete(defaultPass, []);
      }
    }
  }, [isOfflineMode, masterKey, vaultPayload, encryptedVault]);

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
    setIsAuthLoading(true);
    setCurrentUser(user);
    setIsAuthModalOpen(false);

    const effectivePass = masterPasswordUsed || (user.uid + '_aegis_master_key');
    saveSessionPassword(effectivePass);

    let remoteVault = await fetchVaultFromFirestore(user.uid);
    if (!remoteVault) {
      const localVault = loadEncryptedVault();
      if (localVault) {
        remoteVault = localVault;
        await saveVaultToFirestore(user.uid, localVault);
      }
    }

    if (remoteVault) {
      setEncryptedVault(remoteVault);
      saveEncryptedVault(remoteVault);
      const unlocked = await unlockWithVaultObject(remoteVault, effectivePass);
      if (!unlocked) {
        await handleSetupComplete(effectivePass, []);
      }
    } else {
      await handleSetupComplete(effectivePass, []);
    }
    setIsAuthLoading(false);
  };

  const handleSignOut = async () => {
    await logoutUser();
    clearSessionPassword();
    clearEncryptedVaultStorage();
    setCurrentUser(null);
    setMasterKey(null);
    setVaultPayload(null);
    setEncryptedVault(null);
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
    const creds = vaultPayload?.credentials || [];
    let csv = 'Website,URL,Username,Password,Category,Notes,Created\n';
    creds.forEach((c) => {
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
    try {
      const parsed = JSON.parse(jsonString);
      let importedCredentials: Credential[] = [];

      if (Array.isArray(parsed)) {
        importedCredentials = parsed;
      } else if (parsed.credentials && Array.isArray(parsed.credentials)) {
        importedCredentials = parsed.credentials;
      }

      const currentCreds = vaultPayload?.credentials || [];
      const merged = [...importedCredentials, ...currentCreds];
      // Deduplicate by websiteName + username
      const uniqueMap = new Map<string, Credential>();
      merged.forEach((item) => {
        const key = `${item.websiteName}-${item.username}`;
        if (!uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const updatedList = Array.from(uniqueMap.values());
      const basePayload = vaultPayload || { credentials: [] };
      await saveUpdatedPayload({ ...basePayload, credentials: updatedList });
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

  // Loading State while checking Auth session
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center animate-pulse">
            <Lock className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-mono">Loading Password Vault...</span>
        </div>
      </div>
    );
  }

  // State 1: Unauthenticated -> Show Sign In / Sign Up Landing Page
  if (!currentUser && !isOfflineMode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isUnlocked={false}
          onLockVault={handleSignOut}
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
            onContinueOffline={() => {
              setIsOfflineMode(true);
              const defaultPass = 'offline_local_master_key';
              if (!encryptedVault) {
                handleSetupComplete(defaultPass, []);
              } else {
                handleUnlock(defaultPass);
              }
            }}
            isInline={true}
          />
        </div>
        <Footer />
      </div>
    );
  }

  const credentialsList = vaultPayload?.credentials || [];

  // State 2: Vault Unlocked -> Main Application Layout
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
        vaultItemCount={credentialsList.length}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            credentials={credentialsList}
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
            credentials={credentialsList}
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
            credentials={credentialsList}
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
            credentialsCount={credentialsList.length}
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
