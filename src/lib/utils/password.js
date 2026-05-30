/**
 * Password utility containing validation rules aligned with NIST SP 800-63B & OWASP,
 * and a secure CSPRNG password generator.
 */

/**
 * Validates a password against NIST SP 800-63B and OWASP standards.
 * 
 * @param {string} password - The password to validate.
 * @param {string} [username] - The user's username for anti-predictability checks.
 * @param {string} [name] - The user's full name for anti-predictability checks.
 * @returns {{isValid: boolean, errors: string[], criteria: {lengthOk: boolean, hasUppercase: boolean, hasNumber: boolean, hasSymbol: boolean, isPredictable: boolean}}}
 */
export function validatePassword(password, username = '', name = '') {
  const errors = [];

  if (!password) {
    errors.push("Password tidak boleh kosong");
    return {
      isValid: false,
      errors,
      criteria: {
        lengthOk: false,
        hasUppercase: false,
        hasNumber: false,
        hasSymbol: false,
        isPredictable: false
      }
    };
  }

  const len = password.length;

  // 1. Length Validation (NIST SP 800-63B: 8 to 64 characters)
  if (len < 8) {
    errors.push("Password kurang dari 8 karakter");
  } else if (len > 64) {
    errors.push("Password lebih dari 64 karakter");
  }

  // 2. Anti-Predictability (Case-Insensitive)
  const lowerPassword = password.toLowerCase();

  // Username check
  if (username && username.trim().length >= 3) {
    const cleanUsername = username.trim().toLowerCase();
    if (lowerPassword.includes(cleanUsername)) {
      errors.push("Password mengandung unsur username");
    }
  }

  // Full name & name parts check
  if (name && name.trim().length >= 3) {
    const cleanName = name.trim().toLowerCase();
    if (lowerPassword.includes(cleanName)) {
      errors.push("Password mengandung unsur nama");
    } else {
      // Split into parts to prevent containing parts of their name (e.g. "John Doe" -> "john", "doe")
      const nameParts = cleanName.split(/\s+/).filter(part => part.length >= 3);
      if (nameParts.some(part => lowerPassword.includes(part))) {
        errors.push("Password mengandung unsur nama");
      }
    }
  }

  // Common popular/weak passwords
  const COMMON_PASSWORDS = ['password', '12345678', 'admin', 'qwerty', '123456', 'epsight', 'epson'];
  if (COMMON_PASSWORDS.some(word => lowerPassword.includes(word))) {
    errors.push("Password mengandung kata pasaran umum");
  }

  // 3. Complexity Check
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  // Complexity Fallback Rule:
  // - If length is less than 12 (8-11 characters): complexity is MANDATORY.
  // - If length is 12 or more: complexity is relaxed (no blocking errors generated for missing elements).
  if (len < 12) {
    if (!hasUppercase) {
      errors.push("Password belum mengandung huruf kapital");
    }
    if (!hasNumber) {
      errors.push("Password belum mengandung angka");
    }
    if (!hasSymbol) {
      errors.push("Password belum mengandung simbol/karakter khusus");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    criteria: {
      lengthOk: len >= 8 && len <= 64,
      hasUppercase,
      hasNumber,
      hasSymbol,
      isPredictable: errors.some(err => err.includes("username") || err.includes("nama") || err.includes("pasaran"))
    }
  };
}

/**
 * Generates a 16-character secure random password using CSPRNG.
 * Satisfies all complexity rules automatically.
 * 
 * @param {string} [username] - Optional username to ensure generated password doesn't contain it.
 * @param {string} [name] - Optional name to ensure generated password doesn't contain it.
 * @returns {string} The cryptographically secure random password.
 */
export function generateSecurePassword(username = '', name = '') {
  const uppercaseChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercaseChars = 'abcdefghijklmnopqrstuvwxyz';
  const numberChars = '0123456789';
  const symbolChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercaseChars + lowercaseChars + numberChars + symbolChars;

  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : null;
  if (!cryptoObj) {
    throw new Error('Crypto API is not available in this environment');
  }

  /**
   * Helper to generate a secure random integer in [0, max - 1] without modulo bias.
   * @param {number} max 
   */
  function getRandomInt(max) {
    const array = new Uint32Array(1);
    let randomNum;
    do {
      cryptoObj.getRandomValues(array);
      randomNum = array[0];
    } while (randomNum >= Math.floor(4294967296 / max) * max);
    return randomNum % max;
  }

  // Ensure at least one character of each type to guarantee validation criteria match
  const required = [
    uppercaseChars[getRandomInt(uppercaseChars.length)],
    lowercaseChars[getRandomInt(lowercaseChars.length)],
    numberChars[getRandomInt(numberChars.length)],
    symbolChars[getRandomInt(symbolChars.length)]
  ];

  // Fill the remaining 12 characters to reach 16 characters securely
  const remaining = [];
  for (let i = 0; i < 12; i++) {
    remaining.push(allChars[getRandomInt(allChars.length)]);
  }

  // Combine and shuffle securely using Durstenfeld algorithm
  const combined = [...required, ...remaining];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = getRandomInt(i + 1);
    const temp = combined[i];
    combined[i] = combined[j];
    combined[j] = temp;
  }

  const password = combined.join('');

  // Self-validation check to handle the extremely astronomical chance of violating anti-predictability
  const validation = validatePassword(password, username, name);
  if (!validation.isValid) {
    return generateSecurePassword(username, name);
  }

  return password;
}
