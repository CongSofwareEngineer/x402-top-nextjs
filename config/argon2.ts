import argon2 from "argon2";

export const CONFIG_ARGON2_DEFAULT = {
  // Argon2id params (OWASP recommended for high-security applications)
  type: argon2.argon2id, // Hybrid: chống cả side-channel + GPU/ASIC attack
  memoryCost: Number(process.env.ARGON2_MEMORY_COST), // 128 MB RAM (tối đa an toàn cho server)
  timeCost: Number(process.env.ARGON2_TIME_COST), // 6 passes → ~2-4s/server request (chống brute-force)
  parallelism: 2, // 2 threads
  hashLength: 32, // 256-bit output (đủ cho AES-256 key)
  saltLength: 32, // 256-bit salt
  raw: true, // Trả về raw buffer thay vì hex string
} as const;

export const CONFIG_ARGON2_CIPHER = {
  algorithm: "aes-256-gcm",
  ivLength: 12, // 96-bit nonce (NIST SP 800-38D)
  tagLength: 16, // 128-bit auth tag

  // Encoding
  encoding: "base64" as const,
} as const;
