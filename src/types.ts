export interface Credential {
  id: string;
  websiteName: string;
  websiteUrl: string;
  username: string;
  password: string;
  category: string; // e.g. 'Social', 'Work', 'Finance', 'Personal', 'Other'
  notes?: string;
  isFavorite?: boolean;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  lastPasswordChange?: string; // ISO String
}

export interface EncryptedVault {
  version: number; // e.g. 1
  salt: string; // Base64 salt for PBKDF2
  verifierIv: string; // Base64 IV for verifier
  verifierCiphertext: string; // Base64 ciphertext verifying correct master key decryption
  vaultIv: string; // Base64 IV for vault payload
  vaultCiphertext: string; // Base64 ciphertext containing JSON string of VaultPayload
  updatedAt: string;
}

export interface VaultPayload {
  credentials: Credential[];
  categories: string[];
}

export interface SecuritySettings {
  autoLockMinutes: number; // 0 for manual/never, or 1, 5, 15, 30
  lockOnTabSwitch: boolean;
  clearClipboardSeconds: number; // 10, 30, 60
  theme: 'dark' | 'light';
}

export interface StrengthCheck {
  id: string;
  label: string;
  passed: boolean;
  tip: string;
}

export interface PasswordStrengthResult {
  score: number; // 0 to 100
  rating: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string; // Tailwind color class or hex
  entropyBits: number;
  crackTimeFormatted: string;
  checks: StrengthCheck[];
  warnings: string[];
  suggestions: string[];
}

export interface GeneratorOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeSimilar: boolean;
}

export type ActiveTab = 'dashboard' | 'vault' | 'checker' | 'generator' | 'audit' | 'settings';
