'use client'
import { useCallback, useState } from 'react'
import { AppKitButton } from '@reown/appkit/react'
import { useAccount, useSignTypedData, useChainId, useSwitchChain } from 'wagmi'

import { DOMAIN, NETWORK } from '@/config/x402'

const TRANSFER_WITH_AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
}

function safeBase64Encode(data: string): string {
  const bytes = new TextEncoder().encode(data)
  const binaryString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')

  return btoa(binaryString)
}

function safeBase64Decode(data: string): string {
  const binaryString = atob(data)
  const bytes = new Uint8Array(binaryString.length)

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }

  return new TextDecoder('utf-8').decode(bytes)
}

function generateNonce(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32))

  return ('0x' +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')) as `0x${string}`
}

type PaymentRequired = {
  x402Version: number
  error?: string
  resource: Record<string, unknown>
  accepts: PaymentRequirement[]
  extensions?: Record<string, unknown>
}

type PaymentRequirement = {
  scheme: string
  network: string
  maxAmountRequired: string
  resource: string
  description: string
  mimeType: string
  payTo: `0x${string}`
  maxTimeoutSeconds: number
  asset: `0x${string}`
  extra?: Record<string, unknown>
}

type PaymentPayload = {
  x402Version: number
  payload: {
    authorization: {
      from: string
      to: string
      value: string
      validAfter: string
      validBefore: string
      nonce: string
    }
    signature: string
  }
  accepted?: PaymentRequirement
  resource?: Record<string, unknown>
  extensions?: Record<string, unknown>
}

type Step = {
  label: string
  status: 'pending' | 'active' | 'success' | 'error'
  detail?: string
}

type ApiEndpoint = {
  id: 'report' | 'send-token' | 'cron-pay'
  path: string
  price: string
  description: string
}

const ENDPOINTS: ApiEndpoint[] = [
  {
    id: 'report',
    path: 'report',
    price: '$0.001',
    description: 'premium agent insight analysis',
  },
  // {
  //   id: 'send-token',
  //   path: 'send-token',
  //   price: '$0.001',
  //   description: 'asset dispatch for autonomous agents',
  // },
  {
    id: 'cron-pay',
    path: 'cron-pay',
    price: '$0.001',
    description: 'asset dispatch for autonomous agents',
  },
]

function ApiCard({ endpoint, onCall, steps, loading }: { endpoint: ApiEndpoint; onCall: () => void; steps: Step[]; loading: boolean }) {
  return (
    <div className='rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg'>
      <div className='flex items-center justify-between'>
        <div>
          <h3 className='text-lg font-semibold text-zinc-100'>/{endpoint.path}</h3>
          <p className='text-sm text-zinc-400'>{endpoint.description}</p>
        </div>
        <span className='rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20'>
          {endpoint.price}
        </span>
      </div>

      <div className='mt-4 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4'>
        <p className='text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2'>API Docs</p>
        <code className='block text-sm text-zinc-300'>
          <span className='text-emerald-400'>GET</span> {DOMAIN}/api/
          {endpoint.path}
        </code>
        <p className='mt-2 text-xs text-zinc-500'>
          Headers returned on 402: <code className='text-zinc-400'>Payment-Required</code> (base64 JSON)
        </p>
        <p className='mt-1 text-xs text-zinc-500'>
          Send along with signature: <code className='text-zinc-400'>PAYMENT-SIGNATURE</code> (base64 JSON)
        </p>
      </div>

      <div className='mt-4 space-y-2'>
        {steps.map((step, index) => (
          <div key={index} className='flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3'>
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                step.status === 'success'
                  ? 'bg-emerald-400'
                  : step.status === 'error'
                    ? 'bg-red-400'
                    : step.status === 'active'
                      ? 'bg-yellow-400 animate-pulse'
                      : 'bg-zinc-700'
              }`}
            />
            <div className='flex-1'>
              <p className='text-sm text-zinc-300'>{step.label}</p>
              {step.detail && <p className='text-xs text-zinc-500 mt-0.5'>{step.detail}</p>}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onCall}
        disabled={loading}
        className='mt-4 w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        {loading ? 'Processing...' : `Call /${endpoint.path}`}
      </button>
    </div>
  )
}

const Page = () => {
  const [loading, setLoading] = useState(false)
  const [endpointSteps, setEndpointSteps] = useState<Record<string, Step[]>>({
    report: [],
    'send-token': [],
    "cron-pay":  [],
  })

  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { mutateAsync: switchChainAsync } = useSwitchChain()
  const { mutateAsync: signTypedDataAsync } = useSignTypedData()

  const updateSteps = useCallback((endpointId: string, steps: Step[] | ((prev: Step[]) => Step[])) => {
    setEndpointSteps((prev) => ({
      ...prev,
      [endpointId]: typeof steps === 'function' ? steps(prev[endpointId] ?? []) : steps,
    }))
  }, [])

  const handleCallApi = async (endpointId: 'report' | 'send-token') => {
    const initialSteps: Step[] = [
      { label: 'Step 1: Call API', status: 'active' },
      { label: 'Step 2: Parse Payment-Required', status: 'pending' },
      { label: 'Step 3: Sign signature (wagmi)', status: 'pending' },
      { label: 'Step 4: Send X-PAYMENT header', status: 'pending' },
      { label: 'Step 5: Receive result', status: 'pending' },
    ]

    updateSteps(endpointId, initialSteps)
    setLoading(true)

    try {
      if (!isConnected || !address) {
        throw new Error('Please connect wallet first')
      }

      const targetChainId = parseInt(NETWORK.split(':')[1])

      if (chainId !== targetChainId) {
        await switchChainAsync({ chainId: targetChainId })
      }

      const res = await fetch(`/api/${endpointId}`)

      console.log({ res })

      if (res.status !== 402) {
        const data = await res.json()

        updateSteps(endpointId, [
          {
            label: 'Step 1: Call API',
            status: 'success',
            detail: 'HTTP 200 - No payment required',
          },
          {
            label: 'Step 2: Parse Payment-Required',
            status: 'success',
            detail: 'No 402',
          },
          {
            label: 'Step 3: Sign signature (wagmi)',
            status: 'success',
            detail: 'Skipped',
          },
          {
            label: 'Step 4: Send X-PAYMENT header',
            status: 'success',
            detail: 'Skipped',
          },
          {
            label: 'Step 5: Receive result',
            status: 'success',
            detail: JSON.stringify(data),
          },
        ])
        setLoading(false)

        return
      }

      const payEncode = res.headers.get('Payment-Required')

      console.log({ payEncode })

      if (!payEncode) {
        throw new Error('Missing Payment-Required header')
      }

      updateSteps(endpointId, [
        {
          label: 'Step 1: Call API',
          status: 'success',
          detail: `HTTP ${res.status} - 402 Payment Required`,
        },
        {
          label: 'Step 2: Parse Payment-Required',
          status: 'active',
          detail: 'Decoding base64...',
        },
        { label: 'Step 3: Sign signature (wagmi)', status: 'pending' },
        { label: 'Step 4: Send X-PAYMENT header', status: 'pending' },
        { label: 'Step 5: Receive result', status: 'pending' },
      ])

      const paymentRequired: PaymentRequired = JSON.parse(safeBase64Decode(payEncode))
      const requirement = paymentRequired.accepts[0]

      updateSteps(endpointId, [
        {
          label: 'Step 1: Call API',
          status: 'success',
          detail: `HTTP ${res.status} - 402 Payment Required`,
        },
        {
          label: 'Step 2: Parse Payment-Required',
          status: 'success',
          detail: `Scheme: ${requirement.scheme}, Network: ${requirement.network}`,
        },
        {
          label: 'Step 3: Sign signature (wagmi)',
          status: 'active',
          detail: 'Opening wallet to sign...',
        },
        { label: 'Step 4: Send X-PAYMENT header', status: 'pending' },
        { label: 'Step 5: Receive result', status: 'pending' },
      ])

      const now = Math.floor(Date.now() / 1000)
      const authorization = {
        from: address,
        to: requirement.payTo,
        value: (requirement as PaymentRequirement & { amount?: string }).amount ?? requirement.maxAmountRequired,
        validAfter: '0',
        validBefore: (now + requirement.maxTimeoutSeconds).toString(),
        nonce: generateNonce(),
      }

      const resolvedChainId = parseInt(requirement.network.split(':')[1])
      const signature = await signTypedDataAsync({
        domain: {
          name: (requirement.extra?.name as string) ?? 'USD Coin',
          version: (requirement.extra?.version as string) ?? '2',
          chainId: resolvedChainId,
          verifyingContract: requirement.asset,
        },
        types: TRANSFER_WITH_AUTHORIZATION_TYPES,
        primaryType: 'TransferWithAuthorization',
        message: {
          from: authorization.from,
          to: authorization.to,
          value: BigInt(authorization.value),
          validAfter: BigInt(authorization.validAfter),
          validBefore: BigInt(authorization.validBefore),
          nonce: authorization.nonce,
        },
      })

      updateSteps(endpointId, [
        {
          label: 'Step 1: Call API',
          status: 'success',
          detail: `HTTP ${res.status} - 402 Payment Required`,
        },
        {
          label: 'Step 2: Parse Payment-Required',
          status: 'success',
          detail: `Scheme: ${requirement.scheme}, Network: ${requirement.network}`,
        },
        {
          label: 'Step 3: Sign signature (wagmi)',
          status: 'success',
          detail: 'Signed EIP-3009 TransferWithAuthorization',
        },
        {
          label: 'Step 4: Send X-PAYMENT header',
          status: 'active',
          detail: 'Sending signature...',
        },
        { label: 'Step 5: Receive result', status: 'pending' },
      ])

      const paymentPayload: PaymentPayload = {
        x402Version: paymentRequired.x402Version,
        payload: {
          authorization,
          signature,
        },
        accepted: requirement,
        resource: paymentRequired.resource,
        extensions: paymentRequired.extensions,
      }

      const paymentHeader = safeBase64Encode(JSON.stringify(paymentPayload))

      const paidRes = await fetch(`/api/${endpointId}`, {
        headers: {
          'PAYMENT-SIGNATURE': paymentHeader,
        },
      })

      if (!paidRes.ok) {
        const errorText = await paidRes.text()

        throw new Error(`Payment failed: ${paidRes.status} ${errorText}`)
      }

      const data = await paidRes.json()

      updateSteps(endpointId, [
        {
          label: 'Step 1: Call API',
          status: 'success',
          detail: `HTTP ${res.status} - 402 Payment Required`,
        },
        {
          label: 'Step 2: Parse Payment-Required',
          status: 'success',
          detail: `Scheme: ${requirement.scheme}, Network: ${requirement.network}`,
        },
        {
          label: 'Step 3: Sign signature (wagmi)',
          status: 'success',
          detail: 'Signed EIP-3009 TransferWithAuthorization',
        },
        {
          label: 'Step 4: Send X-PAYMENT header',
          status: 'success',
          detail: `HTTP ${paidRes.status} - Payment successful`,
        },
        {
          label: 'Step 5: Receive result',
          status: 'success',
          detail: JSON.stringify(data),
        },
      ])
    } catch (err) {
      console.log({ err })

      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'

      updateSteps(endpointId, (prev: Step[]) => {
        const failed = [...prev]
        const activeIndex = failed.findIndex((s) => s.status === 'active')

        if (activeIndex >= 0) {
          failed[activeIndex] = {
            ...failed[activeIndex],
            status: 'error',
            detail: errorMessage,
          }
        }

        return failed
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen bg-zinc-950 text-zinc-100 p-6'>
      <div className='mx-auto max-w-4xl space-y-6'>
        <div className='flex items-center justify-between'>
          <div>
            <h1 className='text-2xl font-bold text-zinc-100'>x402 Payment Demo</h1>
            <p className='text-sm text-zinc-400 mt-1'>Pay for APIs using x402 protocol with Web3 wallet</p>
          </div>
          <AppKitButton />
        </div>

        <div className='grid gap-6 md:grid-cols-2'>
          {ENDPOINTS.map((endpoint) => (
            <ApiCard
              key={endpoint.id}
              endpoint={endpoint}
              onCall={() => handleCallApi(endpoint.id as 'report' | 'send-token')}
              steps={endpointSteps[endpoint.id]}
              loading={loading}
            />
          ))}
        </div>

        <div className='rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 shadow-lg'>
          <h3 className='text-lg font-semibold text-zinc-100 mb-4'>x402 Flow Overview</h3>
          <div className='grid gap-4 md:grid-cols-5'>
            {[
              {
                num: '1',
                title: 'GET',
                desc: 'Call API without payment header',
              },
              {
                num: '2',
                title: '402',
                desc: 'Server returns Payment-Required (base64)',
              },
              {
                num: '3',
                title: 'SIGN',
                desc: 'Client signs EIP-3009 with wagmi',
              },
              {
                num: '4',
                title: 'X-PAYMENT',
                desc: 'Send signature in PAYMENT-SIGNATURE header',
              },
              {
                num: '5',
                title: '200',
                desc: 'Facilitator settle → API returns data',
              },
            ].map((item) => (
              <div key={item.num} className='rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-center'>
                <div className='mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400 border border-emerald-500/20'>
                  {item.num}
                </div>
                <p className='text-sm font-semibold text-zinc-200'>{item.title}</p>
                <p className='text-xs text-zinc-500 mt-1'>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

export default Page
