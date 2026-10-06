// 'use client'

// import { useState } from 'react'
// import { type Address, isAddress, parseUnits, zeroAddress } from 'viem'
// import { useConnection, usePublicClient, useWalletClient } from 'wagmi'
// import { useAppKit, useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'

// import { useERC7702, type SignResult, type Transfer } from '@/hooks/useERC7702'
// import { ATOMIC_STATUS, DEPLOYMENTS_1_3_0, ERC7702_DELEGATOR_IMPL } from '@/constants/erc7702'
// import { USDC_BY_CHAIN } from '@/constants/token'

// // ============================================================================
// // UI Components
// // ============================================================================

// const shorten = (value: string) => `${value.slice(0, 6)}...${value.slice(-4)}`

// const Card = ({ title, children }: { title: string; children: React.ReactNode }) => (
//   <section className='bg-white rounded-xl shadow-md p-6 mb-6'>
//     <h2 className='text-xl font-bold text-gray-900 mb-4'>{title}</h2>
//     {children}
//   </section>
// )

// const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
//   <div className='flex items-center justify-between gap-4 py-1'>
//     <span className='text-gray-600'>{label}</span>
//     <span className='font-mono text-sm text-right break-all'>{children}</span>
//   </div>
// )

// const ActionButton = ({
//   loading,
//   loadingText,
//   ...props
// }: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }) => (
//   <button
//     {...props}
//     disabled={props.disabled || loading}
//     className='w-full py-3 rounded-lg text-white font-semibold transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:opacity-70 disabled:cursor-not-allowed'
//   >
//     {loading ? loadingText : props.children}
//   </button>
// )

// const ErrorText = ({ error }: { error?: Error | null }) =>
//   error ? <p className='mt-3 text-sm text-red-600 break-all'>{(error as { shortMessage?: string }).shortMessage ?? error.message}</p> : null

// const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-md text-sm'

// // ============================================================================
// // Send Tokens
// // ============================================================================

// type Asset = 'native' | 'usdc'
// type Recipient = { to: string; amount: string }

// const EMPTY_RECIPIENT: Recipient = { to: '', amount: '' }

// const SendTokens = ({ erc7702 }: { erc7702: ReturnType<typeof useERC7702> }) => {
//   const { chain } = useConnection()
//   const usdc = erc7702.chainId ? USDC_BY_CHAIN[erc7702.chainId] : undefined
//   const [asset, setAsset] = useState<Asset>('native')
//   const [recipients, setRecipients] = useState<Recipient[]>([EMPTY_RECIPIENT])
//   const [error, setError] = useState<Error | null>(null)

//   const decimals = asset === 'usdc' ? usdc?.decimals : chain?.nativeCurrency.decimals
//   const isValid = recipients.every((r) => isAddress(r.to) && Number(r.amount) > 0)

//   const updateRecipient = (index: number, patch: Partial<Recipient>) =>
//     setRecipients((list) => list.map((r, i) => (i === index ? { ...r, ...patch } : r)))

//   const handleSend = async () => {
//     if (decimals === undefined) return
//     setError(null)
//     try {
//       const transfers: Transfer[] = recipients.map((r) => ({
//         to: r.to as Address,
//         amount: parseUnits(r.amount, decimals),
//         token: asset === 'usdc' ? usdc?.address : undefined,
//       }))

//       await erc7702.sendTransfers(transfers)
//     } catch (err) {
//       setError(err as Error)
//     }
//   }

//   return (
//     <Card title='Send Tokens (batch)'>
//       <select value={asset} onChange={(e) => setAsset(e.target.value as Asset)} className={`${inputClass} mb-4 bg-white`}>
//         <option value='native'>{chain?.nativeCurrency.symbol ?? 'Native'}</option>
//         {usdc && <option value='usdc'>{usdc.symbol}</option>}
//       </select>

//       <div className='space-y-3 mb-4'>
//         {recipients.map((r, i) => (
//           <div key={i} className='flex gap-2'>
//             <input
//               value={r.to}
//               onChange={(e) => updateRecipient(i, { to: e.target.value })}
//               placeholder='0x... recipient'
//               className={`${inputClass} flex-3`}
//             />
//             <input
//               type='number'
//               value={r.amount}
//               onChange={(e) => updateRecipient(i, { amount: e.target.value })}
//               placeholder='0.0'
//               className={`${inputClass} flex-1`}
//             />
//             {recipients.length > 1 && (
//               <button onClick={() => setRecipients((list) => list.filter((_, idx) => idx !== i))} className='px-3 text-red-500 hover:text-red-700'>
//                 ✕
//               </button>
//             )}
//           </div>
//         ))}
//         <button onClick={() => setRecipients((list) => [...list, EMPTY_RECIPIENT])} className='text-sm text-blue-600 hover:text-blue-800 font-medium'>
//           + Add recipient
//         </button>
//       </div>

//       <ActionButton onClick={handleSend} disabled={!isValid} loading={erc7702.isSending} loadingText='Sending...'>
//         Send {recipients.length} transfer{recipients.length > 1 ? 's' : ''} {erc7702.canBatch ? 'in 1 batch' : 'one by one'}
//       </ActionButton>
//       {!erc7702.canBatch && recipients.length > 1 && (
//         <p className='mt-3 text-sm text-gray-500'>
//           {erc7702.atomicStatus === ATOMIC_STATUS.READY
//             ? 'Upgrade to a smart account first to batch transfers — until then each transfer is a separate transaction.'
//             : 'Wallet can’t batch calls — each transfer is a separate transaction.'}
//         </p>
//       )}
//       <ErrorText error={error} />
//     </Card>
//   )
// }

// // ============================================================================
// // Sign
// // ============================================================================

// const SignPanel = ({ erc7702 }: { erc7702: ReturnType<typeof useERC7702> }) => {
//   const [message, setMessage] = useState('')
//   const [result, setResult] = useState<(SignResult & { kind: string }) | null>(null)
//   const [error, setError] = useState<Error | null>(null)

//   const run = (kind: string, sign: (value: string) => Promise<SignResult>) => async () => {
//     setError(null)
//     setResult(null)
//     try {
//       setResult({ kind, ...(await sign(message)) })
//     } catch (err) {
//       setError(err as Error)
//     }
//   }

//   return (
//     <Card title='Sign & Verify'>
//       <textarea
//         value={message}
//         onChange={(e) => setMessage(e.target.value)}
//         placeholder='Message to sign'
//         rows={3}
//         className={`${inputClass} mb-4`}
//       />
//       <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
//         <ActionButton onClick={run('Message', erc7702.signMessage)} disabled={!message} loading={erc7702.isSigning} loadingText='Signing...'>
//           Sign Message
//         </ActionButton>
//         <ActionButton onClick={run('Typed Data', erc7702.signTypedData)} disabled={!message} loading={erc7702.isSigning} loadingText='Signing...'>
//           Sign Typed Data (EIP-712)
//         </ActionButton>
//       </div>

//       {result && (
//         <div className='mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-1'>
//           <p>
//             <span className='font-medium'>{result.kind} — </span>
//             <span className={result.isValid ? 'text-green-600' : 'text-red-600'}>{result.isValid ? 'Valid signature' : 'Invalid signature'}</span>
//           </p>
//           <p className='font-mono break-all text-gray-600'>{result.signature}</p>
//         </div>
//       )}
//       <ErrorText error={error} />
//     </Card>
//   )
// }

// // ============================================================================
// // Header
// // ============================================================================

// const Header = ({ erc7702, onConnect }: { erc7702: ReturnType<typeof useERC7702>; onConnect: () => void }) => {
//   const { chain } = useConnection()

//   return (
//     <header className='flex items-center justify-between gap-4 bg-white rounded-xl shadow-md px-4 py-3 mb-8'>
//       <span className='font-bold text-gray-900'>Smart7702</span>
//       {erc7702.isConnected && erc7702.address ? (
//         <div className='flex items-center gap-3'>
//           <div className='text-right'>
//             <p className='font-mono text-sm text-gray-900'>{shorten(erc7702.address)}</p>
//             <p className='text-xs text-gray-500'>{chain?.name ?? erc7702.chainId}</p>
//           </div>
//           <button
//             onClick={erc7702.disconnect}
//             disabled={erc7702.isDisconnecting}
//             className='px-3 py-2 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-60'
//           >
//             {erc7702.isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
//           </button>
//         </div>
//       ) : (
//         <button onClick={onConnect} className='px-3 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700'>
//           Connect Wallet
//         </button>
//       )}
//     </header>
//   )
// }

// // ============================================================================
// // Dismiss (switch back to a plain EOA)
// // ============================================================================

// const DismissPanel = ({ erc7702 }: { erc7702: ReturnType<typeof useERC7702> }) => {
//   const [result, setResult] = useState<'dismissed' | 'still-delegated' | null>(null)
//   const [error, setError] = useState<Error | null>(null)

//   const handleCheck = async () => {
//     setError(null)
//     setResult(null)
//     try {
//       setResult((await erc7702.refreshDelegation()) ? 'still-delegated' : 'dismissed')
//     } catch (err) {
//       setError(err as Error)
//     }
//   }

//   return (
//     <Card title='Stop using EIP-7702'>
//       <p className='text-sm text-gray-600 mb-3'>
//         Switching back to a standard account clears the delegation (authorization to address 0). It must be signed by your wallet — dapps can&apos;t
//         request it — so use the &quot;switch back to standard account&quot; option in your wallet, wait for the transaction to confirm, then check
//         again here.
//       </p>
//       <ActionButton onClick={handleCheck} loading={erc7702.isRefreshingDelegation} loadingText='Checking...'>
//         I switched back — check again
//       </ActionButton>
//       {result === 'still-delegated' && <p className='mt-3 text-sm text-amber-600'>Still delegated on-chain. Try again once the tx confirms.</p>}
//       <ErrorText error={error} />
//     </Card>
//   )
// }

// // ============================================================================
// // Main Page Component
// // ============================================================================

// export default function Smart7702Page() {
//   const { open } = useAppKit()
//   const { chain } = useConnection()
//   const erc7702 = useERC7702()
//   const [upgradeError, setUpgradeError] = useState<Error | null>(null)

//   const explorer = chain?.blockExplorers?.default.url
//   const canUpgrade = erc7702.isSupportedChain && erc7702.atomicStatus === ATOMIC_STATUS.READY

//   const { data: walletClient } = useWalletClient()
//   const publicClient = usePublicClient()
//   const { address, isConnected } = useAppKitAccount()
//   const { chainId } = useAppKitNetwork()

//   // ============================================
//   // BƯỚC 1: DEPLOY 7702 (Sign Authorization + Send Type 4 Tx)
//   // ============================================
//   const deploy7702 = async () => {
//     try {
//       if (!walletClient || !publicClient || !address) {
//         return
//       }

//       // 2a. Lấy nonce hiện tại của EOA
//       const nonce = await publicClient?.getTransactionCount({
//         address: address as `0x${string}`,
//       })

//       // 2b. Ký Authorization (Viem tự động gọi wallet_signAuthorization qua WC)
//       //     User sẽ thấy popup trên ví yêu cầu ký ủy quyền
//       const authorization = await walletClient?.signAuthorization({
//         contractAddress: DEPLOYMENTS_1_3_0.EIP7702StatelessDeleGatorImpl,
//         chainId: chainId as number,
//         nonce: nonce,
//       })

//       // 2c. Gửi Transaction Type 4 với authorizationList
//       //     Transaction này sẽ set code của EOA = delegate contract
//       const hash = await walletClient?.sendTransaction({
//         to: address as `0x${string}`, // Self-call (gọi chính mình)
//         data: '0x',
//         authorizationList: [authorization!],
//         chain: chain,
//       })

//       // 2d. Chờ transaction được confirm
//       const receipt = await publicClient!.waitForTransactionReceipt({ hash: hash! })
//     } catch (err: any) {
//     } finally {
//     }
//   }

//   // ============================================
//   // BƯỚC 2: REVOKE 7702 (Trở về EOA bình thường)
//   // ============================================
//   const revoke7702 = async () => {
//     if (!walletClient || !publicClient || !address) return

//     try {
//       const nonce = await publicClient.getTransactionCount({
//         address: address as `0x${string}`,
//       })

//       // Revoke bằng cách ký authorization với contractAddress = 0x0000...0000
//       // và nonce = nonce hiện tại
//       const authorization = await walletClient.signAuthorization({
//         contractAddress: zeroAddress as Address, // 0x0000...0000
//         chainId: chainId as number,
//         nonce: nonce,
//       })

//       const hash = await walletClient.sendTransaction({
//         to: address as `0x${string}`,
//         data: '0x',
//         authorizationList: [authorization],
//         chain: chain,
//       })

//       await publicClient.waitForTransactionReceipt({ hash })
//     } catch (err: any) {
//     } finally {
//     }
//   }

//   const delegationLabel = erc7702.isCheckingDelegation
//     ? 'Checking...'
//     : erc7702.isUpgraded
//       ? 'Smart account (DeleGator v1.3.0)'
//       : erc7702.delegate
//         ? `Smart account (wallet implementation ${shorten(erc7702.delegate)})`
//         : 'Plain EOA'

//   return (
//     <div className='min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8'>
//       <div className='max-w-2xl mx-auto'>
//         <Header erc7702={erc7702} onConnect={() => open()} />

//         <div className='text-center mb-8'>
//           <h1 className='text-4xl font-bold text-gray-900 mb-3'>EIP-7702 Smart Account</h1>
//           <p className='text-gray-600'>Upgrade your EOA, send batched transfers and sign — all through EIP-7702.</p>
//         </div>

//         {!erc7702.isConnected ? (
//           <div className='text-center'>
//             <button
//               onClick={() => open()}
//               className='bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors'
//             >
//               Connect Wallet
//             </button>
//           </div>
//         ) : (
//           <>
//             <Card title='Account'>
//               <Row label='Address'>{erc7702.address && shorten(erc7702.address)}</Row>
//               <Row label='Network'>
//                 <span className={erc7702.isSupportedChain ? 'text-green-600' : 'text-red-600'}>
//                   {chain?.name ?? erc7702.chainId} {erc7702.isSupportedChain ? '' : '(7702 not supported)'}
//                 </span>
//               </Row>
//               <Row label='Status'>
//                 <span className={erc7702.isUpgraded ? 'text-green-600' : 'text-gray-800'}>{delegationLabel}</span>
//               </Row>
//               <Row label='Wallet 7702 support'>
//                 <span className={erc7702.atomicStatus === ATOMIC_STATUS.UNSUPPORTED ? 'text-red-600' : 'text-gray-800'}>
//                   {erc7702.atomicStatus ?? 'Checking...'}
//                 </span>
//               </Row>
//               <Row label='Target implementation'>{shorten(ERC7702_DELEGATOR_IMPL)}</Row>
//             </Card>

//             {!erc7702.delegate && (
//               <Card title='Upgrade to Smart Account'>
//                 <p className='text-sm text-gray-600 mb-4'>
//                   Your wallet signs an EIP-7702 authorization and upgrades this EOA in one transaction. The address stays the same — only its code
//                   points to the smart account implementation (MetaMask uses DeleGator v1.3.0, other wallets may use their own).
//                 </p>
//                 <ActionButton onClick={deploy7702} disabled={!canUpgrade} loading={erc7702.isUpgrading} loadingText='Upgrading...'>
//                   Deploy 7702
//                 </ActionButton>
//                 {erc7702.isSupportedChain && erc7702.atomicStatus === ATOMIC_STATUS.UNSUPPORTED && (
//                   <p className='mt-3 text-sm text-amber-600'>This wallet doesn&apos;t support EIP-7702 upgrades (EIP-5792 atomic calls).</p>
//                 )}
//                 <ErrorText error={upgradeError} />
//               </Card>
//             )}

//             {erc7702.delegate && <DismissPanel erc7702={erc7702} />}

//             <SendTokens erc7702={erc7702} />
//             <SignPanel erc7702={erc7702} />

//             {erc7702.txs.length > 0 && (
//               <Card title='Last Transactions'>
//                 {erc7702.txs.map((tx) => (
//                   <Row key={tx.hash} label={tx.status}>
//                     {explorer ? (
//                       <a href={`${explorer}/tx/${tx.hash}`} target='_blank' rel='noreferrer' className='text-blue-600 hover:underline'>
//                         {shorten(tx.hash)}
//                       </a>
//                     ) : (
//                       shorten(tx.hash)
//                     )}
//                   </Row>
//                 ))}
//               </Card>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   )
// }

// app/page.tsx
'use client'

import { useAppKitAccount, useAppKitNetwork } from '@reown/appkit/react'
import { useWalletClient, usePublicClient, useConnection, useConnectorClient, useSignMessage, useSendTransactionSync } from 'wagmi'
import { useState } from 'react'
import { Hex, parseSignature, zeroAddress } from 'viem'
import { hashAuthorization } from 'viem/utils'
import { signAuthorization } from 'viem/actions'

import { DEPLOYMENTS_1_3_0, SIMPLE_7702_ABI } from '@/constants/erc7702'

const DELEGATE_CONTRACT_ADDRESS = DEPLOYMENTS_1_3_0.EIP7702StatelessDeleGatorImpl

export default function Home() {
  const { address, isConnected } = useAppKitAccount()
  const { chainId } = useAppKitNetwork()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { chain, connector } = useConnection()
  const { data: connectorClient } = useConnectorClient()
  const { mutateAsync: signMessageAsync } = useSignMessage()
  const { mutateAsync: sendTransactionAsync } = useSendTransactionSync()

  const [status, setStatus] = useState<string>('')
  const [txHash, setTxHash] = useState<string>('')
  const [is7702, setIs7702] = useState<boolean | null>(null)
  const [delegatedTo, setDelegatedTo] = useState<string>('')
  const [count, setCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  // ============================================
  // BƯỚC 1: KIỂM TRA VÍ ĐÃ LÀ 7702 CHƯA
  // ============================================
  const check7702Status = async () => {
    if (!publicClient || !address) return
    setLoading(true)
    setStatus('Đang kiểm tra bytecode của ví...')

    try {
      const bytecode = await publicClient.getBytecode({ address: address as `0x${string}` })

      if (bytecode && bytecode.startsWith('0xef0100')) {
        const delegated = '0x' + bytecode.slice(8, 48)

        setIs7702(true)
        setDelegatedTo(delegated)
        setStatus(`✅ Ví đang là 7702! Delegate tới: ${delegated}`)
      } else if (bytecode && bytecode !== '0x') {
        setIs7702(false)
        setStatus('⚠️ Ví có bytecode nhưng không phải format 7702')
      } else {
        setIs7702(false)
        setDelegatedTo('')
        setStatus('ℹ️ Ví là EOA bình thường (chưa có 7702)')
      }
    } catch (err: any) {
      setStatus(`❌ Lỗi: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // BƯỚC 2: DEPLOY 7702 (Sign Authorization + Send Type 4 Tx)
  // ============================================
  const deploy7702 = async () => {
    if (!walletClient || !publicClient || !address || !connector) {
      setStatus('❌ Vui lòng kết nối ví trước!')

      return
    }

    setLoading(true)
    setStatus('🔄 Đang chuẩn bị Authorization...')

    try {
      // 2a. Lấy nonce hiện tại của EOA
      const nonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
      })
      const nonceCurrent = nonce + 1

      // console.log({ nonceCurrent })

      // if (!walletClient || !address) return

      // // 1. Generate the signed authorization object
      // const authorization = await walletClient.signAuthorization({
      //   contractAddress: '0xYourSmartAccountImplementationAddress',
      //   delegate: address,
      // })

      // const messageHash = hashAuthorization({
      //   chainId: chainId as number,
      //   nonce: nonceCurrent,
      //   address: DELEGATE_CONTRACT_ADDRESS as `0x${string}`,
      // })

      // console.log({ messageHash })

      // const signature = await signMessageAsync({
      //   message: messageHash,
      // })

      // // setStatus(`📝 Nonce hiện tại: ${nonce}. Đang request ký Authorization trên ví...`)
      // // // ─── BƯỚC 4: Parse signature thành r, s, v để dùng cho Type 4 TX ───
      // const { r, s, v, yParity } = parseSignature(signature as Hex)

      const authorizationObject = {
        chainId: chainId,
        address: DELEGATE_CONTRACT_ADDRESS,
        nonce: nonceCurrent,
        // r,
        // s,
        // v: Number(v),
        // yParity: yParity || v,
      }

      console.log('====================================')
      console.log({ authorizationObject })
      console.log('====================================')

      // 2c. Gửi Transaction Type 4 với authorizationList
      //     Transaction này sẽ set code của EOA = delegate contract
      const result = await sendTransactionAsync({
        to: address as `0x${string}`, // Self-call (gọi chính mình)
        data: '0x',
        authorizationList: [authorizationObject as any],
        account: address as `0x${string}`,
        type: 'eip7702',
      })
      const hash = result.transactionHash

      setTxHash(hash)
      setStatus(`⏳ Đang chờ confirm trên chain... Tx: ${hash.slice(0, 10)}...`)

      // 2d. Chờ transaction được confirm
      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      if (receipt.status === 'success') {
        setStatus(`🎉 DEPLOY 7702 THÀNH CÔNG! EOA của bạn giờ đã có code của contract ${DELEGATE_CONTRACT_ADDRESS}`)
        setIs7702(true)
        setDelegatedTo(DELEGATE_CONTRACT_ADDRESS)
      } else {
        setStatus('❌ Transaction bị revert!')
      }
    } catch (err: any) {
      console.log({ err })
      setStatus(`❌ Lỗi: ${err.shortMessage || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // BƯỚC 3: GỌI HÀM CỦA DELEGATE CONTRACT TRÊN EOA
  // ============================================
  const callIncrement = async () => {
    if (!walletClient || !address) return
    setLoading(true)
    setStatus('🔄 Đang gọi hàm increment() trên EOA (qua 7702)...')

    try {
      // Gọi increment() trực tiếp trên EOA address
      // Vì EOA đã delegate code, nên nó sẽ thực thi hàm increment() của contract
      const hash = await walletClient.writeContract({
        address: address as `0x${string}`, // 👈 Gọi trên chính EOA, KHÔNG phải contract address
        abi: SIMPLE_7702_ABI,
        functionName: 'increment',
        chain: chain,
      })

      setStatus(`⏳ Đang chờ confirm... Tx: ${hash.slice(0, 10)}...`)
      await publicClient!.waitForTransactionReceipt({ hash })
      setStatus(`✅ Increment thành công! Tx: ${hash}`)

      // Đọc lại count
      await readCount()
    } catch (err: any) {
      setStatus(`❌ Lỗi: ${err.shortMessage || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // BƯỚC 4: ĐỌC COUNT TỪ EOA (Storage nằm trên EOA)
  // ============================================
  const readCount = async () => {
    if (!publicClient || !address) return
    try {
      const result = await publicClient.readContract({
        address: address as `0x${string}`, // 👈 Đọc từ EOA
        abi: SIMPLE_7702_ABI,
        functionName: 'getCount',
      })

      console.log({ result })

      setCount(Number(result))
      setStatus(`📊 Count hiện tại: ${result}`)
    } catch (err: any) {
      setStatus(`❌ Lỗi đọc count: ${err.message}`)
    }
  }

  // ============================================
  // BƯỚC 5: REVOKE 7702 (Trở về EOA bình thường)
  // ============================================
  const revoke7702 = async () => {
    if (!walletClient || !publicClient || !address) return
    setLoading(true)
    setStatus('🔄 Đang revoke 7702...')

    try {
      const nonce = await publicClient.getTransactionCount({
        address: address as `0x${string}`,
      })
      const nonceCurrent = nonce + 1

      // // Revoke bằng cách ký authorization với contractAddress = 0x0000...0000
      // // và nonce = nonce hiện tại
      // const messageHash = hashAuthorization({
      //   contractAddress: zeroAddress as `0x${string}`,
      //   chainId: chainId as number,
      //   nonce: nonceCurrent,
      // })

      // const signature = await signMessageAsync({
      //   message: {
      //     raw: messageHash,
      //   },
      // })

      // const { r, s, v, yParity } = parseSignature(signature as Hex)

      const authorizationObject = {
        chainId: chainId,
        address: zeroAddress as `0x${string}`,
        nonce: nonceCurrent,
        // r,
        // s,
        // v: Number(v),
        // yParity: yParity || v,
      }

      const hash = await walletClient.sendTransaction({
        to: address as `0x${string}`,
        data: '0x',
        authorizationList: [authorizationObject as any],
        chain: chain,
        type: 'eip7702',
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setStatus('✅ Revoke thành công! Ví đã trở về EOA bình thường.')
      setIs7702(false)
      setDelegatedTo('')
    } catch (err: any) {
      setStatus(`❌ Lỗi: ${err.shortMessage || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen bg-gray-950 text-white p-8'>
      <div className='max-w-2xl mx-auto space-y-6'>
        <h1 className='text-3xl font-bold text-center'>🔐 EIP-7702 Demo</h1>
        <p className='text-gray-400 text-center'>Next.js + AppKit (Reown) + Viem</p>

        {/* Nút kết nối ví của AppKit */}
        <div className='flex justify-center'>
          {/* @ts-ignore */}
          <appkit-button />
        </div>

        {isConnected && (
          <>
            <div className='bg-gray-900 rounded-xl p-6 space-y-4'>
              <p className='text-sm text-gray-400'>
                Address: <span className='text-green-400 font-mono'>{address}</span>
              </p>
              <p className='text-sm text-gray-400'>
                Network: <span className='text-blue-400'>{chainId === 11155111 ? 'Sepolia' : `Chain ${chainId}`}</span>
              </p>
            </div>

            {/* STATUS */}
            {status && (
              <div className='bg-gray-900 border border-gray-700 rounded-xl p-4'>
                <p className='text-sm whitespace-pre-wrap break-all'>{status}</p>
                {txHash && (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${txHash}`}
                    target='_blank'
                    className='text-blue-400 underline text-sm mt-2 block'
                    rel='noreferrer'
                  >
                    Xem trên Etherscan ↗
                  </a>
                )}
              </div>
            )}

            {/* BUTTONS */}
            <div className='grid grid-cols-1 gap-3'>
              <button
                onClick={check7702Status}
                disabled={loading}
                className='bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold'
              >
                1️⃣ Kiểm tra trạng thái 7702
              </button>

              <button
                onClick={deploy7702}
                disabled={loading || is7702 === true}
                className='bg-green-600 hover:bg-green-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold'
              >
                2️⃣ Deploy 7702 (Delegate EOA → Contract)
              </button>

              {is7702 && (
                <>
                  <button
                    onClick={callIncrement}
                    disabled={loading}
                    className='bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold'
                  >
                    3️⃣ Gọi increment() trên EOA (qua 7702)
                  </button>

                  <button
                    onClick={readCount}
                    disabled={loading}
                    className='bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold'
                  >
                    4️⃣ Đọc Count từ EOA {count !== null && `(Hiện tại: ${count})`}
                  </button>

                  <button
                    onClick={revoke7702}
                    disabled={loading}
                    className='bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-3 rounded-xl font-semibold'
                  >
                    5️⃣ Revoke 7702 (Trở về EOA)
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
