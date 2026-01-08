export function generateRandomPassword(length = 24) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+{}[]<>?";
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);
  
  return Array.from(array)
    .map((num) => charset[num % charset.length])
    .join("");
}