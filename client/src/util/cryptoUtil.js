import CryptoJS from "crypto-js";

async function deriveKey(masterPassword, salt) {
  return await CryptoJS.PBKDF2(masterPassword, salt, {
    keySize: 256 / 32,
    iterations: 100000,
  });
}

export async function encryptPassword(plainPassword, masterPassword) {
  try {
    const salt = CryptoJS.lib.WordArray.random(128 / 8);
    const key = await deriveKey(masterPassword, salt);
    const iv = CryptoJS.lib.WordArray.random(128 / 8);

    const encrypted = CryptoJS.AES.encrypt(plainPassword, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const saltBase64 = salt.toString(CryptoJS.enc.Base64);
    const ivBase64 = iv.toString(CryptoJS.enc.Base64);
    

    return `${saltBase64}:${ivBase64}:${encrypted.toString()}`;
  } catch (err) {
    console.error("Encryption failed", err);
    throw new Error("Encryption failed");
  }
}

export async function decryptPassword(encryptedPayload, masterPassword) {
  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) return null;

    const [saltBase64, ivBase64, ciphertextBase64] = parts;
    const salt = CryptoJS.enc.Base64.parse(saltBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);

    const key = await deriveKey(masterPassword, salt);

    const encryptedData = CryptoJS.lib.CipherParams.create({
      ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64),
    });

    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    const originalText = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    return originalText || null;
  } catch (error) {
    return null;
  }
}

export async function verifyMasterKey(encryptedPayload, masterPasswordInput) {
    const result = await decryptPassword(encryptedPayload, masterPasswordInput);
    return result !== null;
}



export async function findReusedPasswords(passwordsList, masterPassword) {
  const passwordMap = new Map();

  for (const entry of passwordsList) {
    try {
      const plainText = await decryptPassword(entry.encrypted_password, masterPassword);
      
      if (plainText) {

        if (passwordMap.has(plainText)) {
          passwordMap.get(plainText).push(entry.website);
        } else {
          passwordMap.set(plainText, [entry.website]);
        }
      }
    } catch (e) {
      console.warn(`Kunne ikke analysere ${entry.website}`, e);
    }
  }
  const reusedGroups = [];
  passwordMap.forEach((websites, password) => {
    if (websites.length > 1) {
      reusedGroups.push(websites);
    }
  });
  return reusedGroups;
}