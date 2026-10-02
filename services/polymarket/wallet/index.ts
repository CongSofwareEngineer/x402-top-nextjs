import {
  BaseError,
  concat,
  ContractFunctionRevertedError,
  createPublicClient,
  encodeAbiParameters,
  erc20Abi,
  ExecutionRevertedError,
  formatUnits,
  getCreate2Address,
  http,
  keccak256,
  pad,
  RawContractError,
  toHex,
  zeroAddress,
  type Address,
  type Hex,
  type PublicClient,
} from 'viem'
import { polygon } from 'viem/chains'

import { getProfileWallet } from '../gamma'
import { CONTRACTS, ERC1967, FACTORY_BEACON_SELECTOR, PUSD_ADDRESS, SAFE_INIT_CODE_HASH, TOKEN_DECIMALS } from '../constants'
import { type PolymarketAccountWallet } from '../types'

let defaultClient: PublicClient | null = null

/** Polygon public client used for on-chain reads (override per call when you have your own RPC). */
export function polygonClient(client?: PublicClient): PublicClient {
  if (client) return client
  defaultClient ??= createPublicClient({ chain: polygon, transport: http() }) as PublicClient

  return defaultClient
}

/* ----------------------------------------------------------- derivation */

function depositWalletArgs(owner: string, factory: string): Hex {
  const walletId = pad(owner as Hex, { dir: 'left', size: 32 })

  return encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [factory as Address, walletId])
}

/** Solady LibClone.initCodeHashERC1967(implementation, args). */
function initCodeHashERC1967(implementation: Address, args: Hex): Hex {
  const n = BigInt((args.length - 2) / 2)
  const combined = ERC1967.PREFIX + (n << BigInt(56))

  return keccak256(concat([toHex(combined, { size: 10 }), implementation, '0x6009', ERC1967.CONST2, ERC1967.CONST1, args]))
}

/** Solady LibClone.initCodeHashERC1967Beacon(beacon, args). */
function initCodeHashERC1967Beacon(beacon: Address, args: Hex): Hex {
  const n = BigInt((args.length - 2) / 2)
  const combined = ERC1967.BEACON_PREFIX + (n << BigInt(56))

  return keccak256(concat([toHex(combined, { size: 10 }), beacon, ERC1967.BEACON_CONST3, ERC1967.BEACON_CONST2, ERC1967.BEACON_CONST1, args]))
}

function deriveUupsDepositWallet(owner: string): string {
  const args = depositWalletArgs(owner, CONTRACTS.DepositWalletFactory)

  return getCreate2Address({
    from: CONTRACTS.DepositWalletFactory,
    salt: keccak256(args),
    bytecodeHash: initCodeHashERC1967(CONTRACTS.DepositWalletImplementation, args),
  })
}

function deriveBeaconDepositWallet(owner: string, beacon: string): string {
  const args = depositWalletArgs(owner, CONTRACTS.DepositWalletFactory)

  return getCreate2Address({
    from: CONTRACTS.DepositWalletFactory,
    salt: keccak256(args),
    bytecodeHash: initCodeHashERC1967Beacon(beacon as Address, args),
  })
}

/**
 * Legacy Polymarket Gnosis Safe for an external-wallet signer (MetaMask,
 * Rabby…) — the account wallet polymarket.com created before Deposit Wallets.
 */
export function deriveSafeWallet(owner: string): string {
  return getCreate2Address({
    from: CONTRACTS.SafeFactory,
    salt: keccak256(encodeAbiParameters([{ type: 'address' }], [owner as Address])),
    bytecodeHash: SAFE_INIT_CODE_HASH,
  })
}

/* --------------------------------------------------------------- chain */

function isContractRevert(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false

  return (
    error.walk(
      (err) =>
        err instanceof ContractFunctionRevertedError || err instanceof ExecutionRevertedError || (err instanceof RawContractError && err.code === 3)
    ) !== null
  )
}

async function getFactoryBeacon(client: PublicClient): Promise<string> {
  try {
    const { data } = await client.call({ to: CONTRACTS.DepositWalletFactory, data: FACTORY_BEACON_SELECTOR })

    return data && data.length >= 66 ? `0x${data.slice(-40)}` : zeroAddress
  } catch (error) {
    if (isContractRevert(error)) return zeroAddress
    throw error
  }
}

async function isContractDeployed(client: PublicClient, address: string): Promise<boolean> {
  const code = await client.getCode({ address: address as Address })

  return code !== undefined && code !== '0x'
}

/** Deposit Wallet address for a signer (UUPS clone, or beacon clone on newer factories). */
export async function deriveDepositWallet(signer: string, publicClient?: PublicClient): Promise<string> {
  const client = polygonClient(publicClient)
  const uupsAddress = deriveUupsDepositWallet(signer)
  const beacon = await getFactoryBeacon(client)

  if (beacon.toLowerCase() === zeroAddress) return uupsAddress
  if (await isContractDeployed(client, uupsAddress)) return uupsAddress

  return deriveBeaconDepositWallet(signer, beacon)
}

/**
 * Resolve the Polymarket account wallet for a signer (EOA). This wallet — not
 * the EOA — holds pUSD/positions and is what Data / Gamma / Bridge APIs and
 * the trading client must be queried with.
 *
 * Accounts created on polymarket.com before May 4, 2026 trade from a legacy
 * Gnosis Safe; newer accounts use a Deposit Wallet.
 *
 * Order: the Gamma profile's `proxyWallet` when it is one of the signer's
 * derivable wallets → deployed Deposit Wallet → deployed Safe → new
 * (undeployed) Deposit Wallet.
 */
export async function resolveAccountWallet(signer: string, publicClient?: PublicClient): Promise<PolymarketAccountWallet> {
  const client = polygonClient(publicClient)
  const [preferred, depositWallet] = await Promise.all([getProfileWallet(signer).catch(() => null), deriveDepositWallet(signer, client)])
  const safeWallet = deriveSafeWallet(signer)
  const [depositDeployed, safeDeployed] = await Promise.all([isContractDeployed(client, depositWallet), isContractDeployed(client, safeWallet)])

  const deposit: PolymarketAccountWallet = { address: depositWallet, type: 'DEPOSIT_WALLET', deployed: depositDeployed }
  const safe: PolymarketAccountWallet = { address: safeWallet, type: 'SAFE', deployed: safeDeployed }
  const preferredLower = preferred?.toLowerCase()

  if (preferredLower === safeWallet.toLowerCase()) return safe
  if (preferredLower === depositWallet.toLowerCase()) return deposit
  if (depositDeployed) return deposit
  if (safeDeployed) return safe

  return deposit
}

/**
 * Cash available to trade: pUSD held by the account wallet on Polygon.
 * (Data API `/v2/value` only covers open positions, not cash.)
 */
export async function getCashBalance(wallet: string, publicClient?: PublicClient): Promise<number> {
  const balance = await polygonClient(publicClient).readContract({
    address: PUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [wallet as Address],
  })

  return Number(formatUnits(balance, TOKEN_DECIMALS))
}

/**
 * Ask the app server to deploy the signer's Deposit Wallet (gasless — the
 * relayer call needs the Builder secret, so it runs server-side; see
 * `relayer/deployDepositWallet`).
 */
export async function requestDeployDepositWallet(signer: string, endpoint: string): Promise<PolymarketAccountWallet> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: signer }),
  })
  const data = (await res.json().catch(() => null)) as { success?: boolean; proxyAddress?: string; error?: string } | null

  if (!res.ok || !data?.success) throw new Error(data?.error ?? `Deploy failed: ${res.status}`)

  // The relayer returns the deployed wallet — trust it over local derivation.
  return { address: data.proxyAddress ?? (await deriveDepositWallet(signer)), type: 'DEPOSIT_WALLET', deployed: true }
}
