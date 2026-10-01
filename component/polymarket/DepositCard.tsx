'use client'

import type { SupportedAsset } from '@/services/polymarket'

import { useEffect, useMemo, useState } from 'react'
import { useAppKitNetwork } from '@reown/appkit/react'
import QRCode from 'qrcode'
import { zeroAddress } from 'viem'

import { usePolyMarketProfile, useSupportedAssets } from '@/hooks/polymarket'
import { BRIDGE_CHAIN_EXPLORERS } from '@/constants/polymarket'
import { getDepositAddress } from '@/services/polymarket'

const ALL_CHAINS = 'all'

type ChainGroup = { chainId: string; chainName: string; assets: SupportedAsset[] }

export function DepositCard() {
  const { chainId: connectedChainId } = useAppKitNetwork()
  const { data: profile } = usePolyMarketProfile()
  const { data: supportedAssets = [], isLoading } = useSupportedAssets()

  const [chainFilter, setChainFilter] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const chains = useMemo(() => {
    const groups = new Map<string, ChainGroup>()

    for (const asset of supportedAssets) {
      const group = groups.get(asset.chainId) ?? { chainId: asset.chainId, chainName: asset.chainName, assets: [] }

      group.assets.push(asset)
      groups.set(asset.chainId, group)
    }

    return [...groups.values()]
  }, [supportedAssets])

  const connectedChain = chains.find((c) => c.chainId === String(connectedChainId))
  // Until the user picks a chain, follow the connected one (falls back to all chains if unsupported).
  const selectedChainId = chainFilter ?? connectedChain?.chainId ?? ALL_CHAINS

  const visibleChains = useMemo(() => {
    const query = search.trim().toLowerCase()
    const scoped = selectedChainId === ALL_CHAINS ? chains : chains.filter((c) => c.chainId === selectedChainId)

    return scoped
      .map((c) => ({
        ...c,
        assets: query
          ? c.assets.filter((a) => [a.token.symbol, a.token.name, a.token.address].some((v) => v.toLowerCase().includes(query)))
          : c.assets,
      }))
      .filter((c) => c.assets.length > 0)
  }, [chains, selectedChainId, search])

  const visibleCount = visibleChains.reduce((sum, c) => sum + c.assets.length, 0)

  // "All chains" shows the EVM address.
  const depositAddress = getDepositAddress(profile?.bridge?.address, selectedChainId === ALL_CHAINS ? undefined : selectedChainId)
  const selectedChainName = chains.find((c) => c.chainId === selectedChainId)?.chainName
  const explorer = selectedChainId === ALL_CHAINS ? undefined : BRIDGE_CHAIN_EXPLORERS[selectedChainId]

  return (
    <div className='bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4'>
        <div>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2'>
            <svg className='w-5 h-5 text-blue-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
            </svg>
            Deposit
          </h3>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Send any supported token below to your deposit address. It is converted to pUSD on Polymarket automatically.
          </p>
        </div>
        {connectedChainId !== undefined && (
          <span
            className={`self-start px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${
              connectedChain
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}
          >
            {connectedChain ? `Connected: ${connectedChain.chainName}` : `Chain ${connectedChainId} not supported`}
          </span>
        )}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6'>
        <DepositAddressPanel
          address={depositAddress}
          chainName={selectedChainId === ALL_CHAINS ? 'EVM chains' : selectedChainName}
          explorer={explorer}
        />

        <div className='min-w-0 space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <ChainChip
              active={selectedChainId === ALL_CHAINS}
              onClick={() => setChainFilter(ALL_CHAINS)}
              label='All chains'
              count={supportedAssets.length}
            />
            {chains.map((c) => (
              <ChainChip
                key={c.chainId}
                active={selectedChainId === c.chainId}
                onClick={() => setChainFilter(c.chainId)}
                label={c.chainName}
                count={c.assets.length}
                connected={c.chainId === connectedChain?.chainId}
              />
            ))}
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Search token by symbol, name or address'
            className='w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          />

          {isLoading ? (
            <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className='h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse' />
              ))}
            </div>
          ) : visibleCount === 0 ? (
            <p className='text-sm text-gray-500 dark:text-gray-400 py-6 text-center'>No supported tokens match your filter.</p>
          ) : (
            <div className='space-y-4'>
              <p className='text-xs text-gray-500 dark:text-gray-400'>{visibleCount} tokens</p>
              {visibleChains.map((c) => (
                <div key={c.chainId}>
                  {selectedChainId === ALL_CHAINS && (
                    <h4 className='text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2'>
                      {c.chainName} · {c.assets.length}
                    </h4>
                  )}
                  <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2'>
                    {c.assets.map((asset, i) => (
                      <TokenItem key={`${asset.token.address}-${i}`} asset={asset} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DepositAddressPanel({ address, chainName, explorer }: { address?: string; chainName?: string; explorer?: string }) {
  const [qr, setQr] = useState<string>()
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!address) return setQr(undefined)
    let cancelled = false

    QRCode.toDataURL(address, { width: 440, margin: 1 })
      .then((url) => !cancelled && setQr(url))
      .catch(() => !cancelled && setQr(undefined))

    return () => {
      cancelled = true
    }
  }, [address])

  const handleCopy = () => {
    if (!address) return
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className='bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 self-start'>
      <p className='text-xs text-gray-500 dark:text-gray-400 mb-2'>Deposit address{chainName ? ` · ${chainName}` : ''}</p>
      {address ? (
        <>
          <div className='bg-white rounded-lg p-2 mx-auto w-full max-w-55 aspect-square flex items-center justify-center'>
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={`QR code for ${address}`} className='w-full h-full' />
            ) : (
              <div className='w-full h-full bg-gray-100 animate-pulse rounded' />
            )}
          </div>
          <code className='block mt-3 text-xs font-mono text-gray-900 dark:text-white break-all'>{address}</code>
          <div className='flex gap-2 mt-3'>
            <button
              onClick={handleCopy}
              className='flex-1 px-2 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20'
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            {explorer && (
              <a
                href={`${explorer}/${address}`}
                target='_blank'
                rel='noopener noreferrer'
                className='flex-1 text-center px-2 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700'
              >
                Explorer
              </a>
            )}
          </div>
          <p className='mt-3 text-xs text-yellow-700 dark:text-yellow-400'>
            Only send tokens listed for this chain. Amounts below the minimum may not be credited.
          </p>
        </>
      ) : (
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          {chainName ? `No deposit address available for ${chainName}.` : 'Deposit address not available yet.'}
        </p>
      )}
    </div>
  )
}

function ChainChip({
  active,
  onClick,
  label,
  count,
  connected,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  connected?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full border flex items-center gap-1.5 ${
        active
          ? 'bg-blue-600 border-blue-600 text-white'
          : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
      }`}
    >
      {connected && <span className='w-1.5 h-1.5 rounded-full bg-green-500' />}
      {label}
      <span className={active ? 'text-blue-100' : 'text-gray-400'}>{count}</span>
    </button>
  )
}

function TokenItem({ asset }: { asset: SupportedAsset }) {
  const { token, minCheckoutUsd } = asset
  const isNative = token.address === zeroAddress

  return (
    <div className='flex items-center gap-3 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2'>
      <div className='w-8 h-8 shrink-0 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300'>
        {token.symbol.slice(0, 4)}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-1.5'>
          <span className='text-sm font-medium text-gray-900 dark:text-white truncate'>{token.symbol}</span>
          {isNative && <span className='text-[10px] px-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'>Native</span>}
        </div>
        <p className='text-xs text-gray-500 dark:text-gray-400 truncate' title={isNative ? token.name : `${token.name} · ${token.address}`}>
          {isNative ? token.name : `${token.address.slice(0, 6)}...${token.address.slice(-4)}`}
        </p>
      </div>
      <div className='text-right shrink-0'>
        <p className='text-[10px] uppercase text-gray-400'>Min</p>
        <p className='text-sm font-semibold text-gray-900 dark:text-white'>${minCheckoutUsd.toFixed(2)}</p>
      </div>
    </div>
  )
}
