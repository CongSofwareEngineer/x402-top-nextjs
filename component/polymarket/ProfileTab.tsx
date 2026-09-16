'use client'

import { useEffect, useState } from 'react'
import { useAppKitAccount } from '@reown/appkit/react'
import { createPublicClient, createSecureClient } from '@polymarket/client'
import { useConnectorClient, useSendTransaction, useSignMessage, useSignTypedData } from 'wagmi'
import { buildHmacSignature } from '@polymarket/client'
import { keccak256, encodeAbiParameters, parseAbiParameters, getAddress, encodePacked, createWalletClient } from 'viem'
import { builderApiKey } from '@polymarket/client/node'

import {
  useBridgeStatus,
  useCreateDepositAddress,
  useCreateWithdrawalAddress,
  useDeploySafe,
  usePolyMarketPortfolio,
  usePolyMarketPositions,
  usePolyMarketProfile,
  usePolyMarketIsDeploy,
  useSupportedAssets,
} from '@/hooks/polymarket'
import { useWalletBalance } from '@/hooks/useWalletBalance'
import { EXPLORERS } from '@/constants/polymarket'
import { KEY_POLY_MARKET } from '@/config/polymarket'

export function ProfileTab() {
  const { address, isConnected } = useAppKitAccount()
  const { data: portfolio, isLoading: portfolioLoading } = usePolyMarketPortfolio()
  const { data: positions = [], isLoading: positionsLoading } = usePolyMarketPositions()
  const { data: profile } = usePolyMarketProfile()
  const { data: walletBalance, refetch: refetchWalletBalance } = useWalletBalance()
  const { data: bridge = { transactions: [] } } = useBridgeStatus(address)
  const { data: supportedAssets = [] } = useSupportedAssets()
  const { data: isDeploy } = usePolyMarketIsDeploy()

  const { mutate: createDeposit, data: depositResult, isPending: depositPending, error: depositError } = useCreateDepositAddress()
  const { mutate: createWithdrawal, data: withdrawalResult, isPending: withdrawalPending, error: withdrawalError } = useCreateWithdrawalAddress()
  const { mutate: deploySafe, isPending: deployPending, error: deployError } = useDeploySafe()
  const { mutateAsync: signTypedDataAsync } = useSignTypedData()
  const [withdrawChainId, setWithdrawChainId] = useState('8453')
  const { data: walletClient } = useConnectorClient()
  const { mutateAsync: signTypedData } = useSignTypedData()
  const { mutateAsync: signMessage } = useSignMessage()
  const { mutateAsync: sendTransaction } = useSendTransaction()

  console.log({ portfolio })

  const depositAddress = depositResult?.address?.evm
  const withdrawalAddress = withdrawalResult?.address?.evm
  const portfolioValue = portfolio?.value ?? 0
  const positionsValue = positions.reduce((sum, p) => sum + p.currentValue, 0)

  if (!isConnected) {
    return (
      <div className='text-center py-12'>
        <div className='w-20 h-20 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center'>
          <svg className='w-10 h-10 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
          </svg>
        </div>
        <h2 className='text-xl font-semibold text-gray-900 dark:text-white mb-2'>Connect Wallet</h2>
        <p className='text-gray-500 dark:text-gray-400'>Connect your wallet to view your Polymarket profile and manage funds.</p>
      </div>
    )
  }

  const handleCreateWithdrawal = () => {
    if (!address) return
    createWithdrawal({
      address,
      toChainId: withdrawChainId,
      toTokenAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      recipientAddr: address,
    })
  }

  function deriveDepositWalletAddress(signerAddress: string): string {
    const factory = '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07'

    // walletId = bytes32(signer) - left-pad to 32 bytes
    const walletId = signerAddress.toLowerCase().padStart(66, '0x0') as `0x${string}`

    // args = abi.encode(factory, walletId)
    const args = encodeAbiParameters(parseAbiParameters('address, bytes32'), [factory as `0x${string}`, walletId])

    // salt = keccak256(args)
    const salt = keccak256(args)

    // ⚠️ SỬA Ở ĐÂY: Bọc toàn bộ bytecode dài trong hàm keccak256 để ra đúng 32 bytes
    // ⚠️ SỬA Ở ĐÂY: Bọc toàn bộ bytecode dài trong hàm keccak256 để ra đúng 32 bytes
    const rawBytecode =
      '0x608060405260405161085a38038061085a833981016040819052610022916101eb565b61002b8261003b565b61003481610085565b5050610249565b8060601b60601c9050684343a0dc92ed22dbfc5481684343a0dc92ed22dbfc5581817f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f38a35050565b6001600160a01b0316803b6100a157636d3e283b5f526004601cfd5b8068911c5a209f08d5ec5e55807fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b5f38a26100db816100de565b50565b60408051600481526024810182526020810180516001600160e01b03166356e4349f60e11b17905290515f9182916001600160a01b038516916101209161021c565b50503d805f8114610158576040519150601f19603f3d011682016040523d82523d5f602084013e61015d565b606091505b5091509150818015610170575080516020145b80156101ae57507f4bc04a483367e3b8d2c7dac8d60b56e696d24ef97f345830002d363ea50a2298818060200190518101906101ac9190610232565b145b6101cb57604051631e74708d60e01b815260040160405180910390fd5b505050565b80516001600160a01b03811681146101e6575f5ffd5b919050565b5f5f604083850312156101fc575f5ffd5b610205836101d0565b9150610213602084016101d0565b90509250929050565b5f82518060208501845e5f920191825250919050565b5f60208284031215610242575f5ffd5b5051919050565b610604806102565f395ff3fe608060405234801561000f575f5ffd5b50600436106100b9575f3560e01c8063715018a611610072578063b39c459311610058578063b39c45931461018e578063d4eec5a61461019e578063f2fde38b146101a6575f5ffd5b8063715018a6146101765780638da5cb5b1461017e575f5ffd5b80635b48684e116100a25780635b48684e1461010c5780635c60da1b146101145780636a883ded14610141575f5ffd5b80633659cfe6146100bd57806354bd838b146100d2575b5f5ffd5b6100d06100cb366004610567565b6101b9565b005b6100f97f4bc04a483367e3b8d2c7dac8d60b56e696d24ef97f345830002d363ea50a229881565b6040519081526020015b60405180910390f35b6100d06101cd565b61011c61024e565b60405173ffffffffffffffffffffffffffffffffffffffff9091168152602001610103565b61011c61014f366004610567565b5f6020819052908152604090205473ffffffffffffffffffffffffffffffffffffffff1681565b6100d061028e565b684343a0dc92ed22dbfc5461011c565b68911c5a209f08d5ec5e5461011c565b6100d06102a1565b6100d06101b4366004610567565b610330565b6101c1610356565b6101ca81610374565b50565b335f8181526020819052604080822080547fffffffffffffffffffffffff000000000000000000000000000000000000000016905568911c5a209f08d5ec5e54905173ffffffffffffffffffffffffffffffffffffffff90911692917fd70d37e6618959bdba868db2d4138b221ef96101565dfc1a0bd38af1d3ab63c191a3565b335f9081526020819052604081205473ffffffffffffffffffffffffffffffffffffffff16801561027e57919050565b505068911c5a209f08d5ec5e5490565b610296610356565b61029f5f6103d7565b565b5f6102b368911c5a209f08d5ec5e5490565b335f8181526020819052604080822080547fffffffffffffffffffffffff00000000000000000000000000000000000000001673ffffffffffffffffffffffffffffffffffffffff86169081179091559051939450927fe1dc7792699a69777c1f0b1695b7c1b9a2677af13bb0b61b9b9b975d30acf7b29190a350565b610338610356565b8060601b61034d57637448fbae5f526004601cfd5b6101ca816103d7565b684343a0dc92ed22dbfc54331461029f576382b429005f526004601cfd5b73ffffffffffffffffffffffffffffffffffffffff16803b61039d57636d3e283b5f526004601cfd5b8068911c5a209f08d5ec5e55807fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b5f38a26101ca81610421565b8060601b60601c9050684343a0dc92ed22dbfc5481684343a0dc92ed22dbfc5581817f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e05f38a35050565b60408051600481526024810182526020810180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff167fadc8693e0000000000000000000000000000000000000000000000000000000017905290515f91829173ffffffffffffffffffffffffffffffffffffffff85169161049e916105a1565b5f60405180830381855afa9150503d805f81146104d6576040519150601f19603f3d011682016040523d82523d5f602084013e6104db565b606091505b50915091508180156104ee575080516020145b801561052c57507f4bc04a483367e3b8d2c7dac8d60b56e696d24ef97f345830002d363ea50a22988180602001905181019061052a91906105b7565b145b610562576040517f1e74708d00000000000000000000000000000000000000000000000000000000815260040160405180910390fd5b505050565b5f60208284031215610577575f5ffd5b813573ffffffffffffffffffffffffffffffffffffffff8116811461059a575f5ffd5b9392505050565b5f82518060208501845e5f920191825250919050565b5f602082840312156105c7575f5ffd5b505191905056fea2646970667358221220ebc26a977d69cf7be38807cc33b11cd6f9000f17ff0bc2910a717c8dd6a1c4a064736f6c6343000822003300000000000000000000000047ebfac3353314c788b96cdcbf41daadfe03629c000000000000000000000000ccf6f84c4b7e4a22a080233f68ed3bba3fc4ab16'

    // ✅ HASH BYTECODE ĐỂ RA ĐÚNG 32 BYTES
    const beaconInitCodeHash = keccak256(rawBytecode)

    // CREATE2: keccak256(0xff ++ factory ++ salt ++ initCodeHash)[12:]
    const create2Input = encodePacked(['bytes1', 'address', 'bytes32', 'bytes32'], ['0xff', factory as `0x${string}`, salt, beaconInitCodeHash])

    const addressBytes = keccak256(create2Input).slice(26)

    return getAddress(`0x${addressBytes}`)
  }

  const deployAccount = async () => {
    try {
      const builderSecret = KEY_POLY_MARKET.Builder.Secret
      const builderApiKey = KEY_POLY_MARKET.Builder.ApiKey
      const builderPassphrase = KEY_POLY_MARKET.Builder.Passphrase
      const signerAddress = address // Địa chỉ ví signer của bạn

      const body = JSON.stringify({
        type: 'WALLET-CREATE',
        from: signerAddress,
        to: '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07',
        metadata: 'Deploy Deposit Wallet',
      })

      const timestamp = Math.floor(Date.now() / 1000)
      const method = 'POST'
      const path = '/submit'
      const signature = await buildHmacSignature(builderSecret, timestamp, method, path, body)

      const clientSecureClient = await createSecureClient({
        signer: {
          getAddress: async () => Promise.resolve(address!),
          signMessage: async (message) => {
            const res = await signMessage({
              message: {
                raw: message,
              },
            })

            return res
          },
          sendTransaction: async (transaction) => Promise.resolve(sendTransaction(transaction)),
          signTypedData: async (typedData) => Promise.resolve(signTypedData(typedData)),
        },
        wallet: address,
        apiKey: {
          POLY_BUILDER_API_KEY: builderApiKey,
          POLY_BUILDER_PASSPHRASE: builderPassphrase,
          POLY_BUILDER_SIGNATURE: signature,
          POLY_BUILDER_TIMESTAMP: `${timestamp}`,
        },
      })

      clientSecureClient.account

      const client = createPublicClient()

      console.log({ account: clientSecureClient.account, client, clientSecureClient })

      // const proxyAddress = deriveDepositWalletAddress(address?.toString() as string)

      // console.log({ proxyAddress })

      // // ⚠️ QUAN TRỌNG: Body phải được stringify chính xác như lúc bạn gửi đi
      // // Nếu dùng JSON.stringify mặc định, nó sẽ không có khoảng trắng thừa.
      // const body = JSON.stringify({
      //   type: 'WALLET-CREATE',
      //   from: signerAddress,
      //   to: '0x00000000000Fb5C9ADea0298D729A0CB3823Cc07',
      //   metadata: 'Deploy Deposit Wallet',
      // })

      // // Tạo signature

      // // Gửi request
      // const response = await fetch('https://relayer-v2.polymarket.com/submit', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     POLY_BUILDER_API_KEY: builderApiKey,
      //     POLY_BUILDER_TIMESTAMP: timestamp.toString(),
      //     POLY_BUILDER_PASSPHRASE: builderPassphrase,
      //     POLY_BUILDER_SIGNATURE: signature,
      //   },
      //   body: body, // Gửi đúng chuỗi body đã dùng để ký
      // })

      // const result = await response.json()

      // console.log('Kết quả:', result)
    } catch (error) {
      console.log({ error })
    }
  }

  const selectedAsset = supportedAssets.find((a) => a.chainId === withdrawChainId)

  return (
    <div className='space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-white'>Profile</h2>
          <p className='text-gray-500 dark:text-gray-400'>Manage your Polymarket account and funds</p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-sm font-medium'>
            Connected
          </span>
          <span className='font-mono text-sm text-gray-500 dark:text-gray-400'>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </span>
        </div>
      </div>

      {(portfolioLoading || positionsLoading) && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse'>
              <div className='h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2' />
              <div className='h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2' />
            </div>
          ))}
        </div>
      )}

      {profile && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <div className='flex items-center gap-4'>
            {profile.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.profileImage}
                alt={profile.name ?? profile.pseudonym ?? 'profile'}
                className='w-16 h-16 rounded-full object-cover flex-shrink-0'
              />
            ) : (
              <div className='w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0'>
                <span className='text-lg font-semibold text-gray-400'>{(profile.name ?? profile.pseudonym ?? '?').slice(0, 1)}</span>
              </div>
            )}
            <div className='min-w-0'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h3 className='text-lg font-bold text-gray-900 dark:text-white truncate'>{profile.name ?? profile.pseudonym ?? 'Unnamed profile'}</h3>
                {profile.verifiedBadge && (
                  <span className='text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full px-2 py-0.5'>
                    Verified
                  </span>
                )}
              </div>
              {profile.pseudonym && profile.pseudonym !== profile.name && (
                <p className='text-sm text-gray-500 dark:text-gray-400'>@{profile.pseudonym}</p>
              )}
              {profile.xUsername && (
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  X: <span className='text-blue-600 dark:text-blue-400'>@{profile.xUsername}</span>
                </p>
              )}
              {profile.bio && <p className='text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2'>{profile.bio}</p>}
            </div>
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
        <BalanceCard
          title='Polymarket Balance'
          value={formatCurrency(portfolioValue)}
          subtitle='pUSD value'
          icon={<WalletIcon className='w-6 h-6' />}
          color='blue'
        />
        <BalanceCard
          title='Wallet Balance'
          value={walletBalance !== null && walletBalance !== undefined ? formatCurrency(walletBalance) : 'Loading...'}
          subtitle='USDC on Base'
          icon={<WalletIcon className='w-6 h-6' />}
          color='green'
          action={
            <button onClick={() => refetchWalletBalance()} className='text-xs text-blue-600 dark:text-blue-400 hover:underline'>
              Refresh
            </button>
          }
        />
        <BalanceCard
          title='Open Positions'
          value={formatNumber(positions.length)}
          subtitle={formatCurrency(positionsValue)}
          icon={<ChartIcon className='w-6 h-6' />}
          color='purple'
        />
      </div>

      {isDeploy === false && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
            <DeployIcon className='w-5 h-5 text-orange-600' />
            Deploy Polymarket Account
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
            Your Polymarket Safe wallet is not deployed yet. Deploy it to start trading and depositing funds.
          </p>
          {deployError && <p className='text-sm text-red-500 mb-4'>{(deployError as Error).message}</p>}
          <button
            onClick={deployAccount}
            disabled={deployPending || !address}
            className='w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
          >
            {deployPending ? 'Deploying...' : 'Deploy Safe Wallet'}
          </button>
        </div>
      )}

      {isDeploy !== false && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <DepositIcon className='w-5 h-5 text-blue-600' />
              Deposit USDC
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              Send USDC from your wallet to the deposit address below to fund your Polymarket trading account.
            </p>
            {depositError && <p className='text-sm text-red-500 mb-4'>{(depositError as Error).message}</p>}
            {depositPending ? (
              <p className='text-sm text-gray-500 dark:text-gray-400 animate-pulse'>Fetching deposit address...</p>
            ) : depositAddress ? (
              <div className='space-y-3'>
                <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
                  <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>Deposit address (Base USDC)</label>
                  <div className='flex items-center gap-2'>
                    <code className='flex-1 text-xs font-mono text-gray-900 dark:text-white break-all'>{depositAddress}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(depositAddress)}
                      className='px-2 py-1 text-xs text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 flex-shrink-0'
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <a
                    href={`${EXPLORERS.BASE}/address/${depositAddress}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  >
                    View on BaseScan
                  </a>
                  <button
                    onClick={() => {}}
                    className='px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700'
                  >
                    Refresh address
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2'>
              <WithdrawIcon className='w-5 h-5 text-green-600' />
              Withdraw USDC
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400 mb-4'>
              Create a withdrawal destination, then send pUSD from your Polymarket wallet to the address below.
            </p>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>Destination chain</label>
                <select
                  value={withdrawChainId}
                  onChange={(e) => setWithdrawChainId(e.target.value)}
                  className='w-full px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent'
                >
                  {supportedAssets.length > 0 ? (
                    supportedAssets.map((asset) => (
                      <option key={`${asset.chainId}-${asset.token.address}`} value={asset.chainId}>
                        {asset.chainName} · {asset.token.symbol}
                      </option>
                    ))
                  ) : (
                    <option value='8453'>Base · USDC</option>
                  )}
                </select>
              </div>
              {selectedAsset && (
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Withdrawing to {selectedAsset.chainName} as {selectedAsset.token.symbol} (min checkout ${selectedAsset.minCheckoutUsd.toFixed(2)})
                </p>
              )}
              <button
                onClick={handleCreateWithdrawal}
                disabled={withdrawalPending}
                className='w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
              >
                {withdrawalPending ? 'Creating destination...' : 'Create withdrawal destination'}
              </button>
              {withdrawalError && <p className='text-sm text-red-500'>{(withdrawalError as Error).message}</p>}
              {withdrawalAddress && (
                <div className='bg-gray-50 dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700'>
                  <label className='block text-xs text-gray-500 dark:text-gray-400 mb-1'>Withdrawal address (send pUSD here)</label>
                  <div className='flex items-center gap-2'>
                    <code className='flex-1 text-xs font-mono text-gray-900 dark:text-white break-all'>{withdrawalAddress}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(withdrawalAddress)}
                      className='px-2 py-1 text-xs text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700 rounded hover:bg-green-50 dark:hover:bg-green-900/20 flex-shrink-0'
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {bridge.transactions.length > 0 && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Recent Transfers</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Chain</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Amount</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Status</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {bridge.transactions.map((tx, i) => (
                  <tr key={i} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{tx.fromChainId}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{(Number(tx.fromAmountBaseUnit) / 1e6).toFixed(2)} USDC</td>
                    <td className='px-6 py-4'>
                      <span className='px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 uppercase'>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!positionsLoading && positions.length > 0 && (
        <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
          <div className='p-6 border-b border-gray-200 dark:border-gray-700'>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>Open Positions</h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Market</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Outcome</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Shares</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Avg Price</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>Value</th>
                  <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider'>P&L</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200 dark:divide-gray-700'>
                {positions.map((position, i) => (
                  <tr key={`${position.tokenId}-${i}`} className='hover:bg-gray-50 dark:hover:bg-gray-800/50'>
                    <td className='px-6 py-4'>
                      <div className='text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs'>{position.title}</div>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          position.outcome === 'Yes'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {position.outcome}
                      </span>
                    </td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatNumber(position.currentSize)}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>${position.avgPrice.toFixed(4)}</td>
                    <td className='px-6 py-4 text-sm text-gray-900 dark:text-white'>{formatCurrency(position.currentValue)}</td>
                    <td className='px-6 py-4'>
                      <span
                        className={`text-sm font-medium ${position.totalPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                      >
                        {position.totalPnl >= 0 ? '+' : ''}
                        {formatCurrency(position.totalPnl)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function formatNumber(num: number) {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`

  return num.toFixed(2)
}

const formatCurrency = (num: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(num)

function BalanceCard({
  title,
  value,
  subtitle,
  icon,
  color,
  action,
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'purple'
  action?: React.ReactNode
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400',
  }

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <div className='flex items-center justify-between'>
        <div>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{title}</p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>{value}</p>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{subtitle}</p>
        </div>
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>{icon}</div>
      </div>
      {action && <div className='mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end'>{action}</div>}
    </div>
  )
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
      />
    </svg>
  )
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth={2}
        d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      />
    </svg>
  )
}

function DepositIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
    </svg>
  )
}

function DeployIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
    </svg>
  )
}

function WithdrawIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill='none' stroke='currentColor' viewBox='0 0 24 24'>
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 20V4m-8 8h16' />
    </svg>
  )
}
