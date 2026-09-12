const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const NUMBERS = "23456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const SETS = [LOWER, UPPER, NUMBERS, SYMBOLS] as const;

function secureIndex(maximum: number) {
  const limit = 256 - (256 % maximum);
  const byte = new Uint8Array(1);
  do {
    globalThis.crypto.getRandomValues(byte);
  } while (byte[0] >= limit);
  return byte[0] % maximum;
}

export function generatePassword(length = 24) {
  if (!Number.isInteger(length) || length < 16 || length > 128)
    throw new Error("Password length must be between 16 and 128.");
  const alphabet = SETS.join("");
  const characters = SETS.map((set) => set[secureIndex(set.length)]);
  while (characters.length < length) characters.push(alphabet[secureIndex(alphabet.length)]);
  for (let index = characters.length - 1; index > 0; index -= 1) {
    const other = secureIndex(index + 1);
    [characters[index], characters[other]] = [characters[other], characters[index]];
  }
  return characters.join("");
}
