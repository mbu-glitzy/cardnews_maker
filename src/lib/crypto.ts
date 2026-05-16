import crypto from "node:crypto";
import { getServerEnv } from "@/lib/env";

/**
 * AES-256-GCM 으로 사용자 API 키 등 민감 정보를 암호화/복호화.
 * 결과 포맷: base64(iv || authTag || ciphertext)
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getKey(): Buffer {
  const env = getServerEnv();
  return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(payload: string): string {
  const key = getKey();
  const data = Buffer.from(payload, "base64");
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const ciphertext = data.subarray(IV_LENGTH + 16);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

/**
 * 표시용 마스킹: 앞 4자리 + ... + 뒤 4자리
 */
export function maskKey(key: string): string {
  if (key.length <= 12) return "****";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}
