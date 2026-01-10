// import CryptoJS from "crypto-js";

// export async function deriveKey(masterKey, salt) {
//   return await CryptoJS.PBKDF2(masterKey, salt, {
//     keySize: 256 / 32,
//     iterations: 100000,
//   });
// }

// export async function decryptPassword(masterKey, encryptedPayload) {
//   const parts = encryptedPayload.split(":");
//   if (parts.length !== 3) {
//     console.error("Payload is wrong - must be  salt:iv:ciphertext");
//     return null;
//   }
//   const [saltBase64, ivBase64, ciphertextBase64] = parts;

//   const salt = CryptoJS.enc.Base64.parse(saltBase64);
//   const iv = CryptoJS.enc.Base64.parse(ivBase64);

//   const key = await deriveKey(masterKey, salt);

//   const encryptedData = CryptoJS.lib.CipherParams.create({
//     ciphertext: CryptoJS.enc.Base64.parse(ciphertextBase64),
//   });

//   const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, key, {
//     iv: iv,
//     mode: CryptoJS.mode.CBC,
//     padding: CryptoJS.pad.Pkcs7,
//   });

//   const originalText = decryptedBytes.toString(CryptoJS.enc.Utf8);

//   return originalText;
// }

// export async function handleMasterPasswordVerification(
//   masterPassword,
//   passwordToDecrypt,
//   selectedPasswordId,
//   decryptedPasswords
// ) {
//   const key = masterPassword;
//   const encryptedValue = passwordToDecrypt;
//   const currentId = selectedPasswordId;

//   if (key && encryptedValue && currentId) {
//     try {
//       const decryptedPassword = await decryptPassword(key, encryptedValue);

//       if (!decryptedPassword) {
//         console.error("Wrong masterpassword or the drcryption failed");
//         return;
//       }

//       decryptedPasswords = {
//         ...decryptedPasswords,
//         [currentId]: decryptedPassword,
//       };

//       setTimeout(() => {
//         const tempPasswords = { ...decryptedPasswords };
//         delete tempPasswords[currentId];
//         decryptedPasswords = tempPasswords;
//       }, 5000);
//     } catch (error) {
//       console.error("Fejl under dekryptering/kryptering:", error);
//     }

//     passwordToDecrypt = null;
//     selectedPasswordId = null;
//   }
// }

export function getSearchParam(key) {
  if (typeof window === "undefined") {
    return "";
  }

  const urlParams = new URLSearchParams(window.location.search);
  const value = urlParams.get(key);

  return value || "";
}
