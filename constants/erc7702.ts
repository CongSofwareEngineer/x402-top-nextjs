import { type Address, type Hex } from 'viem'

// ============================================================================
// EIP-7702 Configuration
// ============================================================================

// With EIP-7702 the EOA itself becomes the smart account: its code is set to
// `0xef0100 || implementation`. Nothing is deployed — the wallet signs an
// authorization that points the EOA at an implementation contract.

/** Prefix of an EOA's code once it has delegated via EIP-7702 */
export const EIP7702_DELEGATION_PREFIX = '0xef0100' as Hex

// Chain IDs where EIP-7702 is supported (Pectra upgrade enabled)
export const SUPPORTED_CHAINS_7702 = [1, 10, 137, 8453, 84532] as const
export type SupportedChainId = (typeof SUPPORTED_CHAINS_7702)[number]

/** Demo EIP-712 payload for the "sign typed data" action */
export const SIGN_TYPED_DATA_DEMO = {
  domain: { name: 'Smart7702 Demo', version: '1' },
  types: {
    Mail: [
      { name: 'from', type: 'address' },
      { name: 'contents', type: 'string' },
    ],
  },
  primaryType: 'Mail',
} as const

// MetaMask Delegation Framework v1.3.0 — same addresses on every supported chain.
// EIP-7702 only needs EIP7702StatelessDeleGatorImpl (delegation target);
// EntryPoint is for bundler/UserOps, DelegationManager + enforcers for scoped permissions.
export const DEPLOYMENTS_1_3_0 = {
  DelegationManager: '0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3',
  EntryPoint: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
  SimpleFactory: '0x69Aa2f9fe1572F1B640E1bbc512f5c3a734fc77c',
  // Implementations
  MultiSigDeleGatorImpl: '0x56a9EdB16a0105eb5a4C54f4C062e2868844f3A7',
  HybridDeleGatorImpl: '0x48dBe696A4D990079e039489bA2053B36E8FFEC4',
  EIP7702StatelessDeleGatorImpl: '0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B',
  // Caveat Enforcers
  AllowedCalldataEnforcer: '0xc2b0d624c1c4319760C96503BA27C347F3260f55',
  AllowedMethodsEnforcer: '0x2c21fD0Cb9DC8445CB3fb0DC5E7Bb0Aca01842B5',
  AllowedTargetsEnforcer: '0x7F20f61b1f09b08D970938F6fa563634d65c4EeB',
  ApprovalRevocationEnforcer: '0xe264F1f09A19505a1ca1a86D5b01E8bFdb64324A',
  BlockNumberEnforcer: '0x5d9818dF0AE3f66e9c3D0c5029DAF99d1823ca6c',
  DeployedEnforcer: '0x24ff2AA430D53a8CD6788018E902E098083dcCd2',
  ERC20BalanceChangeEnforcer: '0xcdF6aB796408598Cea671d79506d7D48E97a5437',
  ERC20TransferAmountEnforcer: '0xf100b0819427117EcF76Ed94B358B1A5b5C6D2Fc',
  ERC20PeriodTransferEnforcer: '0x474e3Ae7E169e940607cC624Da8A15Eb120139aB',
  ERC20StreamingEnforcer: '0x56c97aE02f233B29fa03502Ecc0457266d9be00e',
  ERC721BalanceChangeEnforcer: '0x8aFdf96eDBbe7e1eD3f5Cd89C7E084841e12A09e',
  ERC721TransferEnforcer: '0x3790e6B7233f779b09DA74C72b6e94813925b9aF',
  ERC1155BalanceChangeEnforcer: '0x63c322732695cAFbbD488Fc6937A0A7B66fC001A',
  ExactCalldataBatchEnforcer: '0x982FD5C86BBF425d7d1451f974192d4525113DfD',
  ExactCalldataEnforcer: '0x99F2e9bF15ce5eC84685604836F71aB835DBBdED',
  ExactExecutionBatchEnforcer: '0x1e141e455d08721Dd5BCDA1BaA6Ea5633Afd5017',
  ExactExecutionEnforcer: '0x146713078D39eCC1F5338309c28405ccf85Abfbb',
  IdEnforcer: '0xC8B5D93463c893401094cc70e66A206fb5987997',
  LogicalOrWrapperEnforcer: '0xE1302607a3251AF54c3a6e69318d6aa07F5eB46c',
  LimitedCallsEnforcer: '0x04658B29F6b82ed55274221a06Fc97D318E25416',
  NativeBalanceChangeEnforcer: '0xbD7B277507723490Cd50b12EaaFe87C616be6880',
  ArgsEqualityCheckEnforcer: '0x44B8C6ae3C304213c3e298495e12497Ed3E56E41',
  NativeTokenPaymentEnforcer: '0x4803a326ddED6dDBc60e659e5ed12d85c7582811',
  NativeTokenTransferAmountEnforcer: '0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320',
  NativeTokenStreamingEnforcer: '0xD10b97905a320b13a0608f7E9cC506b56747df19',
  NativeTokenPeriodTransferEnforcer: '0x9BC0FAf4Aca5AE429F4c06aEEaC517520CB16BD9',
  NonceEnforcer: '0xDE4f2FAC4B3D87A1d9953Ca5FC09FCa7F366254f',
  OwnershipTransferEnforcer: '0x7EEf9734E7092032B5C56310Eb9BbD1f4A524681',
  RedeemerEnforcer: '0xE144b0b2618071B4E56f746313528a669c7E65c5',
  SpecificActionERC20TransferBatchEnforcer: '0x6649b61c873F6F9686A1E1ae9ee98aC380c7bA13',
  TimestampEnforcer: '0x1046bb45C8d673d4ea75321280DB34899413c069',
  ValueLteEnforcer: '0x92Bf12322527cAA612fd31a0e810472BBB106A8F',
  MultiTokenPeriodEnforcer: '0xFB2f1a9BD76d3701B730E5d69C3219D42D80eBb7',
} as const

/** Implementation MetaMask upgrades the EOA to when it becomes a smart account */
export const ERC7702_DELEGATOR_IMPL = DEPLOYMENTS_1_3_0.EIP7702StatelessDeleGatorImpl as Address

// ============================================================================
// EIP-5792 (wallet_sendCalls)
// ============================================================================

// Dapps can't sign a 7702 authorization, so the upgrade goes through `wallet_sendCalls` with
// atomic required: a 7702-capable wallet upgrades the EOA itself (MetaMask → EIP7702StatelessDeleGatorImpl,
// other wallets → their own implementation) and runs the calls in the same type-4 tx.

/** `atomic.status` from `wallet_getCapabilities` */
export const ATOMIC_STATUS = {
  /** Already a smart account — calls run atomically */
  SUPPORTED: 'supported',
  /** Plain EOA the wallet can upgrade on the next atomic `wallet_sendCalls` */
  READY: 'ready',
  UNSUPPORTED: 'unsupported',
} as const
export type AtomicStatus = (typeof ATOMIC_STATUS)[keyof typeof ATOMIC_STATUS]

/** `status` of a call bundle from `wallet_getCallsStatus` */
export const CALLS_STATUS = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const

/** Status of a tx sent from the smart7702 page */
export const TX_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  REVERTED: 'reverted',
} as const
export type TxStatus = (typeof TX_STATUS)[keyof typeof TX_STATUS]

// lib/contract.ts

// 👉 THAY BẰNG ADDRESS CONTRACT BẠN ĐÃ DEPLOY TRÊN SEPOLIA
export const DELEGATE_CONTRACT_ADDRESS = '0xYOUR_DEPLOYED_CONTRACT_ADDRESS' as const

export const SIMPLE_7702_ABI = [
  {
    inputs: [],
    name: 'increment',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'count',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
