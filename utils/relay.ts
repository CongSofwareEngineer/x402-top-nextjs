import {
  Address,
  concat,
  ContractFunctionRevertedError,
  encodeAbiParameters,
  encodePacked,
  ExecutionRevertedError,
  getCreate2Address,
  Hex,
  keccak256,
  pad,
  RawContractError,
  toHex,
  zeroAddress,
} from 'viem'
import { BaseError } from 'wagmi'

import {
  CONTRACT_POLY_MARKET,
  ERC1967_BEACON_CONST1,
  ERC1967_BEACON_CONST2,
  ERC1967_BEACON_CONST3,
  ERC1967_BEACON_PREFIX,
  ERC1967_CONST1,
  ERC1967_CONST2,
  ERC1967_PREFIX,
} from '@/constants/contractPolyMarket'
import { PROXY_INIT_CODE_HASH } from '@/constants/polymarket'

function depositWalletArgs(owner: string, factory: string): Hex {
  const walletId = pad(owner as Hex, { dir: 'left', size: 32 })

  return encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [factory as Address, walletId])
}

/**
 * Replicates Solady LibClone.initCodeHashERC1967(implementation, args).
 * Hash of: prefix(10) | implementation(20) | 0x6009(2) | const2(32) | const1(32) | args(n)
 */
function initCodeHashERC1967(implementation: Address, args: Hex): Hex {
  const n = BigInt((args.length - 2) / 2)
  const combined = ERC1967_PREFIX + (n << BigInt(56))

  return keccak256(concat([toHex(combined, { size: 10 }), implementation as Hex, '0x6009', ERC1967_CONST2, ERC1967_CONST1, args]))
}

export const deriveUupsDepositWallet = (owner: string, factory: string, implementation: string): string => {
  const args = depositWalletArgs(owner, factory)
  const salt = keccak256(args)
  const bytecodeHash = initCodeHashERC1967(implementation as Address, args)

  return getCreate2Address({ from: factory as Hex, salt, bytecodeHash })
}

export function decodeAddressReturnData(data?: string): string {
  if (data === undefined || data.length < 66) {
    return zeroAddress
  }

  return `0x${data.slice(-40)}`
}

export function isContractRevert(error: unknown): boolean {
  if (!(error instanceof BaseError)) {
    return false
  }

  return (
    error.walk(
      (err) =>
        err instanceof ContractFunctionRevertedError || err instanceof ExecutionRevertedError || (err instanceof RawContractError && err.code === 3)
    ) !== null
  )
}

/**
 * Replicates Solady LibClone.initCodeHashERC1967Beacon(beacon, args).
 */
function initCodeHashERC1967Beacon(beacon: Address, args: Hex): Hex {
  const n = BigInt((args.length - 2) / 2)
  const combined = BigInt(ERC1967_BEACON_PREFIX) + (n << BigInt(56))

  return keccak256(concat([toHex(combined, { size: 10 }), beacon as Hex, ERC1967_BEACON_CONST3, ERC1967_BEACON_CONST2, ERC1967_BEACON_CONST1, args]))
}

export const deriveBeaconDepositWallet = (owner: string, factory: string, beacon: string): string => {
  const args = depositWalletArgs(owner, factory)
  const salt = keccak256(args)
  const bytecodeHash = initCodeHashERC1967Beacon(beacon as Address, args)

  return getCreate2Address({ from: factory as Hex, salt, bytecodeHash })
}

export const deriveProxyWallet = (address: string): string => {
  return getCreate2Address({
    bytecodeHash: PROXY_INIT_CODE_HASH as Hex,
    from: CONTRACT_POLY_MARKET.DepositWalletFactory as Hex,
    salt: keccak256(encodePacked(['address'], [address as Hex])),
  })
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const sanitizedBase64 = base64
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '')
  const binaryString = atob(sanitizedBase64)
  const bytes = new Uint8Array(binaryString.length)

  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }

  return bytes.buffer
}

function toUrlSafeBase64(value: string): string {
  return value.replace(/\+/g, '-').replace(/\//g, '_')
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary)
}

export async function buildHmacSignature(secret: string, timestamp: number, method: string, requestPath: string, body?: string): Promise<string> {
  let message = `${timestamp}${method}${requestPath}`

  if (body !== undefined) {
    message += body
  }

  const cryptoKey = await globalThis.crypto.subtle.importKey('raw', base64ToArrayBuffer(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await globalThis.crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))

  return toUrlSafeBase64(arrayBufferToBase64(signature))
}
