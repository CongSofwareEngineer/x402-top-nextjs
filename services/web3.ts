/**
 * Server-side Web3 service — Base chain only.
 *
 * - Decodes the Argon2 AES-256-GCM encrypted private key (`PRIVATE_KEY_ENCODE`)
 *   before use, using `PRIVATE_KEY_SECRET` as the decryption password.
 * - Signs EIP-712 typed data (incl. the x402 EIP-3009 TransferWithAuthorization)
 *   with a viem local account derived from the decoded key.
 */
import { base } from "viem/chains";
import {
  createPublicClient,
  http,
  type Address,
  type Hash,
  type Hex,
  type TypedData,
  type TypedDataDefinition,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { authorizationTypes } from "@x402/evm";
import { NETWORK } from "@/config/x402";
import { decryptData } from "@/utils/argon2";

export interface TransferWithAuthorizationParams {
  to: Address;
  value: bigint;
  validAfter?: bigint;
  validBefore?: bigint;
  nonce?: Hex;
  domain?: TypedDataDefinition<
    TypedData,
    "TransferWithAuthorization"
  >["domain"];
}

export interface TransferWithAuthorizationResult {
  from: Address;
  to: Address;
  value: bigint;
  validAfter: bigint;
  validBefore: bigint;
  nonce: Hex;
  signature: Hash;
}

/**
 * Only the Base chain (mainnet, CAIP-2 `eip155:8453`) is supported.
 */
export const BASE_CHAIN_ID = base.id; // 8453

if (NETWORK !== `eip155:${BASE_CHAIN_ID}`) {
  throw new Error(
    `Unsupported network: ${NETWORK}. Only Base (eip155:${BASE_CHAIN_ID}) is allowed.`,
  );
}

/**
 * Base mainnet USDC — the EIP-3009 compatible asset used by the exact scheme.
 */
export const USDC_ASSET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;

export const USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_ASSET,
} as const;

export class Web3 {
  /**
   * Base chain configuration — the only supported network.
   */
  readonly chain = base;
  readonly chainId = BASE_CHAIN_ID;
  readonly usdcAsset = USDC_ASSET;
  readonly usdcDomain = USDC_DOMAIN;

  /**
   * Read-only public client for the Base chain.
   */
  readonly publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  private cachedPrivateKey?: Hex;

  /**
   * Decode `PRIVATE_KEY_ENCODE` (Argon2 AES-256-GCM payload) before use.
   *
   * The encrypted payload is produced by `encryptData(privateKey, password)` in
   * `utils/argon2.ts`; `PRIVATE_KEY_SECRET` is the matching password.
   */
  async decodePrivateKey(): Promise<Hex> {
    if (this.cachedPrivateKey) return this.cachedPrivateKey;

    const encoded = process.env.PRIVATE_KEY_ENCODE;
    const secret = process.env.PRIVATE_KEY_SECRET;

    if (!encoded) {
      throw new Error("PRIVATE_KEY_ENCODE is not defined in the environment");
    }
    if (!secret) {
      throw new Error("PRIVATE_KEY_SECRET is not defined in the environment");
    }

    const decoded = await decryptData(encoded, secret);
    const raw = decoded.replace(/^0x/, "");

    if (!/^[0-9a-fA-F]{64}$/.test(raw)) {
      throw new Error(
        "Decoded PRIVATE_KEY_ENCODE is not a valid 32-byte private key",
      );
    }

    this.cachedPrivateKey = `0x${raw}` as Hex;
    return this.cachedPrivateKey;
  }

  /**
   * Viem local account derived from the decoded private key.
   */
  async getAccount() {
    return privateKeyToAccount(await this.decodePrivateKey());
  }

  /**
   * Sign an EIP-712 `TransferWithAuthorization` (EIP-3009) for the x402 exact
   * scheme, paying in USDC on the Base chain.
   */
  async signTransferWithAuthorization({
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    domain = this.usdcDomain,
  }: TransferWithAuthorizationParams): Promise<TransferWithAuthorizationResult> {
    const account = await this.getAccount();
    const resolvedNonce: Hex = nonce ?? this.randomBytes32();
    const now = Math.floor(Date.now() / 1000);
    const resolvedValidAfter: bigint = validAfter ?? BigInt(0);
    const resolvedValidBefore: bigint = validBefore ?? BigInt(now + 3600);

    const signature = await account.signTypedData({
      domain,
      types: authorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: {
        from: account.address,
        to,
        value,
        validAfter: resolvedValidAfter,
        validBefore: resolvedValidBefore,
        nonce: resolvedNonce,
      },
    });

    return {
      from: account.address,
      to,
      value,
      validAfter: resolvedValidAfter,
      validBefore: resolvedValidBefore,
      nonce: resolvedNonce,
      signature,
    };
  }

  /**
   * Generic EIP-712 typed-data signer backed by the decoded private key.
   */
  async signTypedData<
    const TTypedData extends TypedData | Record<string, unknown>,
    TPrimaryType extends string = string,
  >(parameters: TypedDataDefinition<TTypedData, TPrimaryType>): Promise<Hash> {
    const account = await this.getAccount();
    return account.signTypedData(parameters);
  }

  /**
   * Random 32-byte nonce (`bytes32`) for EIP-3009 authorizations.
   */
  randomBytes32(): Hex {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return `0x${Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}` as Hex;
  }
}

/**
 * Shared singleton — decoded key and public client are cached across calls.
 */
export const Web3Service = new Web3();
