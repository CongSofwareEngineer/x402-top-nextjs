// lib/cryptoManager.ts
import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import argon2 from "argon2";
import { CONFIG_ARGON2_CIPHER, CONFIG_ARGON2_DEFAULT } from "@/config/argon2";

// Helper: Đóng gói [salt][iv][ciphertext][tag] → Base64
const packPayload = (
  salt: Buffer,
  iv: Buffer,
  ciphertext: Buffer,
  tag: Buffer,
): string => {
  return Buffer.concat([salt, iv, ciphertext, tag]).toString(
    CONFIG_ARGON2_CIPHER.encoding,
  );
};

// Helper: Tách payload Base64 → các thành phần
const unpackPayload = (
  packed: string,
): {
  salt: Buffer;
  iv: Buffer;
  ciphertext: Buffer;
  tag: Buffer;
} => {
  const buffer = Buffer.from(packed, CONFIG_ARGON2_CIPHER.encoding);

  const saltLen = CONFIG_ARGON2_DEFAULT.saltLength;
  const ivLen = CONFIG_ARGON2_CIPHER.ivLength;
  const tagLen = CONFIG_ARGON2_CIPHER.tagLength;

  // Validate độ dài tối thiểu để tránh crash do offset vô lý
  if (buffer.length < saltLen + ivLen + tagLen) {
    throw new Error("Invalid payload format");
  }

  let offset = 0;

  // Dùng subarray + Buffer.from để cô lập vùng nhớ an toàn
  const salt = Buffer.from(buffer.subarray(offset, offset + saltLen));
  offset += saltLen;

  const iv = Buffer.from(buffer.subarray(offset, offset + ivLen));
  offset += ivLen;

  const tag = Buffer.from(buffer.subarray(buffer.length - tagLen));
  const ciphertext = Buffer.from(
    buffer.subarray(offset, buffer.length - tagLen),
  );

  return { salt, iv, ciphertext, tag };
};

/**
 * 🔒 Mã hóa Private Key / Dữ liệu nhạy cảm
 */
export const encryptData = async (
  data: string,
  password: string,
): Promise<string> => {
  // 1. Sinh salt & IV ngẫu nhiên
  const salt = randomBytes(CONFIG_ARGON2_DEFAULT.saltLength);
  const iv = randomBytes(CONFIG_ARGON2_CIPHER.ivLength);

  // 2. Derive key bằng Argon2id
  const derivedKey = await argon2.hash(password, {
    ...CONFIG_ARGON2_DEFAULT,
    salt,
  });

  const keyBuffer = Buffer.isBuffer(derivedKey)
    ? derivedKey
    : Buffer.from(derivedKey as string, "hex");

  // 3. Mã hóa AES-256-GCM (Chỉ lấy 32 bytes đầu cho AES-256)
  const cipher = createCipheriv(
    CONFIG_ARGON2_CIPHER.algorithm,
    keyBuffer.subarray(0, 32),
    iv,
  );

  let encrypted = cipher.update(data, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // 4. Đóng gói → Base64
  return packPayload(salt, iv, encrypted, authTag);
};

/**
 * 🔓 Giải mã Private Key / Dữ liệu nhạy cảm
 */
export const decryptData = async (
  data: string,
  password: string,
): Promise<string> => {
  // 1. Tách payload
  const { salt, iv, ciphertext, tag } = unpackPayload(data);

  // 2. Derive key từ password + salt tách từ payload
  const derivedKey = await argon2.hash(password, {
    ...CONFIG_ARGON2_DEFAULT,
    salt,
  });

  const keyBuffer = Buffer.isBuffer(derivedKey)
    ? derivedKey
    : Buffer.from(derivedKey as string, "hex");

  // 3. Giải mã và Verify Auth Tag
  const decipher = createDecipheriv(
    CONFIG_ARGON2_CIPHER.algorithm,
    keyBuffer.subarray(0, 32),
    iv,
  );

  decipher.setAuthTag(tag);

  try {
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    // Trả về lỗi chung để tránh rò rỉ nguyên nhân (sai pass hay dữ liệu bị sửa)
    throw new Error("Decryption failed: Invalid password or corrupted payload");
  }
};
