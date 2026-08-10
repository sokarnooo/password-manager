import { EncryptedVault, SecuritySettings } from '../types';

const VAULT_STORAGE_KEY = 'SECURE_PASSWORD_VAULT_DATA_V1';
const SETTINGS_STORAGE_KEY = 'SECURE_PASSWORD_VAULT_SETTINGS_V1';

export const DEFAULT_SETTINGS: SecuritySettings = {
  autoLockMinutes: 5,
  lockOnTabSwitch: true,
  clearClipboardSeconds: 30,
  theme: 'dark',
};

export const DEFAULT_CATEGORIES = [
  'All',
  'Favorites',
  'Social',
  'Work',
  'Finance',
  'Personal',
  'Entertainment',
  'Shopping',
  'Other',
];

export function loadEncryptedVault(): EncryptedVault | null {
  try {
    const raw = localStorage.getItem(VAULT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as EncryptedVault;
  } catch (error) {
    console.error('Failed to load encrypted vault:', error);
    return null;
  }
}

export function saveEncryptedVault(vault: EncryptedVault): void {
  try {
    localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(vault));
  } catch (error) {
    console.error('Failed to save encrypted vault:', error);
  }
}

export function clearEncryptedVaultStorage(): void {
  try {
    localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear vault storage:', error);
  }
}

export function loadSecuritySettings(): SecuritySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (error) {
    console.error('Failed to load security settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSecuritySettings(settings: SecuritySettings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save security settings:', error);
  }
}
