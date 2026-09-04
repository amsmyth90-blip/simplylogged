import { Buffer } from "node:buffer";

export function jsonUtf8Bytes(value: unknown) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

export function utf8Text(value: unknown, maximumCharacters: number, maximumBytes: number) {
  if (typeof value !== "string") return "";
  const source = value.trim().slice(0, maximumCharacters);
  let bytes = 0;
  let result = "";
  for (const character of source) {
    const width = Buffer.byteLength(character, "utf8");
    if (bytes + width > maximumBytes) break;
    result += character;
    bytes += width;
  }
  return result;
}
