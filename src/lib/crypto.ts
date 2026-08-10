import { GeneratorOptions, PasswordStrengthResult, StrengthCheck } from '../types';

// Helper utilities for Base64 <-> ArrayBuffer
export function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

const PBKDF2_ITERATIONS = 600000; // OWASP recommendation for PBKDF2-SHA256
const KNOWN_VERIFIER_STRING = 'PASSWORD_VAULT_VERIFIER_TOKEN_V1';

/**
 * Generate a random 16-byte salt for PBKDF2 key derivation.
 */
export function generateSalt(): string {
  const salt = new Uint8Array(16);
  window.crypto.getRandomValues(salt);
  return arrayBufferToBase64(salt);
}

/**
 * Derive an AES-256-GCM CryptoKey from master password and salt using PBKDF2.
 */
export async function deriveKeyFromMasterPassword(
  masterPassword: string,
  saltBase64: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(masterPassword);
  const saltBuffer = base64ToArrayBuffer(saltBase64);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // Non-extractable for memory security
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Encrypt a string using AES-256-GCM.
 */
export async function encryptData(
  plainText: string,
  key: CryptoKey
): Promise<{ iv: string; ciphertext: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const iv = new Uint8Array(12); // 96-bit IV standard for GCM
  window.crypto.getRandomValues(iv);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return {
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(encryptedBuffer),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM. Throws an error if key/data is invalid or tampered with.
 */
export async function decryptData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Create verifier payload to test if master password is correct without storing master password.
 */
export async function createVerifier(key: CryptoKey): Promise<{ iv: string; ciphertext: string }> {
  return encryptData(KNOWN_VERIFIER_STRING, key);
}

/**
 * Verify if master password key can decrypt the verifier token correctly.
 */
export async function verifyMasterKey(
  key: CryptoKey,
  ivBase64: string,
  ciphertextBase64: string
): Promise<boolean> {
  try {
    const decrypted = await decryptData(ciphertextBase64, ivBase64, key);
    return decrypted === KNOWN_VERIFIER_STRING;
  } catch {
    return false;
  }
}

/**
 * Generate a cryptographically secure random password using window.crypto.getRandomValues.
 */
export function generateSecurePassword(options: GeneratorOptions): string {
  const uppercaseChars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes ambiguous I, O by default if excludeSimilar
  const uppercaseFull = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijkmnopqrstuvwxyz'; // Excludes l
  const lowercaseFull = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '23456789'; // Excludes 0, 1
  const numberFull = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  let upperPool = options.excludeSimilar ? uppercaseChars : uppercaseFull;
  let lowerPool = options.excludeSimilar ? lowercaseChars : lowercaseFull;
  let numberPool = options.excludeSimilar ? numberChars : numberFull;
  let symbolPool = symbolChars;

  let allChars = '';
  const guaranteedChars: string[] = [];

  if (options.useUppercase) {
    allChars += upperPool;
    guaranteedChars.push(getRandomChar(upperPool));
  }
  if (options.useLowercase) {
    allChars += lowerPool;
    guaranteedChars.push(getRandomChar(lowerPool));
  }
  if (options.useNumbers) {
    allChars += numberPool;
    guaranteedChars.push(getRandomChar(numberPool));
  }
  if (options.useSymbols) {
    allChars += symbolPool;
    guaranteedChars.push(getRandomChar(symbolPool));
  }

  if (!allChars) {
    allChars = lowerPool;
    guaranteedChars.push(getRandomChar(lowerPool));
  }

  const remainingLength = Math.max(0, options.length - guaranteedChars.length);
  const passwordChars = [...guaranteedChars];

  for (let i = 0; i < remainingLength; i++) {
    passwordChars.push(getRandomChar(allChars));
  }

  // Fisher-Yates shuffle using CSPRNG
  for (let i = passwordChars.length - 1; i > 0; i--) {
    const randomIndex = getRandomInt(0, i + 1);
    const temp = passwordChars[i];
    passwordChars[i] = passwordChars[randomIndex];
    passwordChars[randomIndex] = temp;
  }

  return passwordChars.join('');
}

function getRandomInt(min: number, max: number): number {
  const range = max - min;
  const randomBuffer = new Uint32Array(1);
  window.crypto.getRandomValues(randomBuffer);
  return min + (randomBuffer[0] % range);
}

function getRandomChar(pool: string): string {
  const index = getRandomInt(0, pool.length);
  return pool[index];
}

/**
 * Common list of top vulnerable/predictable passwords & patterns to flag
 */
const COMMON_PASSWORDS_SET = new Set([
  'password', '123456', '12345678', '123456789', 'qwerty', '12345', 'dragon', 'pussy',
  'baseball', 'football', 'letmein', 'monkey', 'shadow', 'master', 'michael', 'welcome',
  'admin', 'pass123', 'iloveyou', 'starwars', 'sunshine', '123123', 'admin123', 'superman',
  'secret', 'trustno1', 'solaris', 'password1', 'passcode', 'guest', 'root'
]);

/**
 * Comprehensive Password Strength Evaluation
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return {
      score: 0,
      rating: 'Very Weak',
      color: 'bg-red-500',
      entropyBits: 0,
      crackTimeFormatted: 'Instant',
      checks: [
        { id: 'length', label: 'Minimum 12 characters', passed: false, tip: 'Use at least 12 characters for adequate security.' },
        { id: 'upper', label: 'Uppercase letters (A-Z)', passed: false, tip: 'Include capital letters.' },
        { id: 'lower', label: 'Lowercase letters (a-z)', passed: false, tip: 'Include small letters.' },
        { id: 'numbers', label: 'Numbers (0-9)', passed: false, tip: 'Include digits.' },
        { id: 'symbols', label: 'Special characters (!@#$...)', passed: false, tip: 'Include symbols.' },
        { id: 'no-repeat', label: 'No excessive character repetition', passed: true, tip: 'Avoid repeating characters like "aaa" or "111".' },
        { id: 'no-common', label: 'Not a common dictionary password', passed: true, tip: 'Avoid generic words like "password" or "123456".' },
      ],
      warnings: ['Password cannot be empty.'],
      suggestions: ['Enter or generate a strong password.'],
    };
  }

  const length = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  const hasRepeats = /(.)\1{2,}/.test(password); // 3 or more identical in a row
  const hasSequential = /(1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|defg|efgh|fghi|qwerty|asdf)/i.test(password);
  const isCommon = COMMON_PASSWORDS_SET.has(password.toLowerCase());

  // Calculate Character Set Size for Entropy
  let poolSize = 0;
  if (hasLower) poolSize += 26;
  if (hasUpper) poolSize += 26;
  if (hasNumber) poolSize += 10;
  if (hasSymbol) poolSize += 33;

  // Bits of Entropy = length * log2(poolSize)
  const entropyBits = poolSize > 0 ? Math.round(length * Math.log2(poolSize)) : 0;

  // Checks list
  const checks: StrengthCheck[] = [
    {
      id: 'length',
      label: 'Minimum 12 characters',
      passed: length >= 12,
      tip: length < 12 ? `Currently ${length} chars. Aim for at least 12 to 16+ chars.` : 'Sufficient length.',
    },
    {
      id: 'upper',
      label: 'Uppercase letters (A-Z)',
      passed: hasUpper,
      tip: hasUpper ? 'Contains uppercase letters.' : 'Add uppercase characters.',
    },
    {
      id: 'lower',
      label: 'Lowercase letters (a-z)',
      passed: hasLower,
      tip: hasLower ? 'Contains lowercase letters.' : 'Add lowercase characters.',
    },
    {
      id: 'numbers',
      label: 'Numbers (0-9)',
      passed: hasNumber,
      tip: hasNumber ? 'Contains numeric digits.' : 'Add numbers.',
    },
    {
      id: 'symbols',
      label: 'Special characters (!@#$...)',
      passed: hasSymbol,
      tip: hasSymbol ? 'Contains special symbols.' : 'Add symbols for extra entropy.',
    },
    {
      id: 'no-repeat',
      label: 'No character repetition (e.g., "aaa")',
      passed: !hasRepeats,
      tip: hasRepeats ? 'Avoid repeating the same character consecutively.' : 'No repeated patterns found.',
    },
    {
      id: 'no-common',
      label: 'Not a common dictionary word',
      passed: !isCommon && !hasSequential,
      tip: isCommon ? 'This is a widely known leaked password!' : hasSequential ? 'Contains predictable sequence (e.g. "1234" or "qwerty").' : 'No common patterns found.',
    },
  ];

  // Base score algorithm out of 100
  let rawScore = 0;

  // Length points (max 50)
  if (length >= 16) rawScore += 50;
  else if (length >= 14) rawScore += 42;
  else if (length >= 12) rawScore += 35;
  else if (length >= 10) rawScore += 24;
  else if (length >= 8) rawScore += 12;
  else rawScore += length * 1;

  // Variety points (max 40)
  let varietyCount = 0;
  if (hasUpper) varietyCount++;
  if (hasLower) varietyCount++;
  if (hasNumber) varietyCount++;
  if (hasSymbol) varietyCount++;
  rawScore += varietyCount * 10;

  // Deductions
  const warnings: string[] = [];
  const suggestions: string[] = [];

  if (isCommon) {
    rawScore -= 50;
    warnings.push('CRITICAL: This password appears in lists of breached/common passwords.');
    suggestions.push('Change this password immediately.');
  }

  if (hasSequential) {
    rawScore -= 15;
    warnings.push('Contains predictable keyboard sequences (e.g. "qwerty", "1234").');
    suggestions.push('Avoid sequential letters or numbers.');
  }

  if (hasRepeats) {
    rawScore -= 10;
    warnings.push('Contains repeated character runs (e.g. "aaa" or "999").');
    suggestions.push('Mix varied characters instead of repeating identical ones.');
  }

  if (length < 12) {
    suggestions.push('Increase length to 14-16+ characters to drastically increase crack time.');
  }
  if (!hasSymbol) {
    suggestions.push('Include special symbols like !, @, #, $, or %.');
  }

  const score = Math.max(0, Math.min(100, rawScore));

  let rating: PasswordStrengthResult['rating'] = 'Very Weak';
  let color = 'bg-red-500';

  if (score >= 85) {
    rating = 'Very Strong';
    color = 'bg-emerald-500';
  } else if (score >= 70) {
    rating = 'Strong';
    color = 'bg-green-500';
  } else if (score >= 50) {
    rating = 'Fair';
    color = 'bg-amber-500';
  } else if (score >= 30) {
    rating = 'Weak';
    color = 'bg-orange-500';
  } else {
    rating = 'Very Weak';
    color = 'bg-red-500';
  }

  // Calculate Crack Time Estimation
  const crackTimeFormatted = estimateCrackTime(entropyBits);

  return {
    score,
    rating,
    color,
    entropyBits,
    crackTimeFormatted,
    checks,
    warnings,
    suggestions,
  };
}

/**
 * Estimate offline crack time based on entropy and 100 Billion guesses/sec (fast GPU cluster)
 */
function estimateCrackTime(entropyBits: number): string {
  if (entropyBits === 0) return 'Instant';

  const guessesPerSecond = 100_000_000_000; // 100 Billion/s
  const totalCombinations = Math.pow(2, entropyBits);
  const averageSecondsToCrack = (totalCombinations / 2) / guessesPerSecond;

  if (averageSecondsToCrack < 1) return 'Instant';
  if (averageSecondsToCrack < 60) return `${Math.round(averageSecondsToCrack)} seconds`;
  if (averageSecondsToCrack < 3600) return `${Math.round(averageSecondsToCrack / 60)} minutes`;
  if (averageSecondsToCrack < 86400) return `${Math.round(averageSecondsToCrack / 3600)} hours`;
  if (averageSecondsToCrack < 31536000) return `${Math.round(averageSecondsToCrack / 86400)} days`;
  if (averageSecondsToCrack < 3153600000) return `${Math.round(averageSecondsToCrack / 31536000)} years`;
  if (averageSecondsToCrack < 315360000000) return `${Math.round(averageSecondsToCrack / 315360000)} centuries`;
  return 'Trillions of years';
}
