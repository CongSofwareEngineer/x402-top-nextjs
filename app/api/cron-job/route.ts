import type { NextRequest } from 'next/server'

import { NextResponse } from 'next/server'

import { Web3Service } from '@/services/web3'
// import { DOMAIN } from "@/config/x402";

const DOMAIN = process.env.DOMAIN_API

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
  amount: string
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
      from: `0x${string}`
      to: `0x${string}`
      value: string
      validAfter: string
      validBefore: string
      nonce: `0x${string}`
    }
    signature: `0x${string}`
  }
  accepted?: PaymentRequirement
  resource?: Record<string, unknown>
  extensions?: Record<string, unknown>
}

type Step = {
  label: string
  status: 'pending' | 'active' | 'success' | 'error'
  detail?: string
  header?: Record<string, string>
}

const base64Encode = (data: string): string => Buffer.from(data, 'utf8').toString('base64')

const base64Decode = (data: string): string => Buffer.from(data, 'base64').toString('utf8')

async function payForEndpoint(): Promise<Step[]> {
  const url = `${DOMAIN}/api/send-token`
  const steps: Step[] = []

  try {
    // Step 1: Call API without payment header
    steps.push({ label: 'Step 1: Call API', status: 'active' })
    const res = await fetch(url)

    if (res.status !== 402) {
      const data = await res.json()

      steps.push(
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
          label: 'Step 3: Sign signature (Web3Service)',
          status: 'success',
          detail: 'Skipped',
        },
        {
          label: 'Step 4: Send PAYMENT-SIGNATURE header',
          status: 'success',
          detail: 'Skipped',
        },
        {
          label: 'Step 5: Receive result',
          status: 'success',
          detail: JSON.stringify(data),
        }
      )

      return steps
    }

    // Step 2: Parse Payment-Required (base64)
    const payEncode = res.headers.get('Payment-Required')

    if (!payEncode) {
      throw new Error('Missing Payment-Required header')
    }

    steps.push({
      label: 'Step 1: Call API',
      status: 'success',
      detail: `HTTP ${res.status} - 402 Payment Required`,
    })
    steps.push({
      label: 'Step 2: Parse Payment-Required',
      status: 'active',
      detail: 'Decoding base64...',
    })

    const paymentRequired: PaymentRequired = JSON.parse(base64Decode(payEncode))
    const requirement = paymentRequired.accepts[0]

    const resolvedChainId = parseInt(requirement.network.split(':')[1])

    steps[steps.length - 1] = {
      label: 'Step 2: Parse Payment-Required',
      status: 'success',
      detail: `Scheme: ${requirement.scheme}, Network: ${requirement.network}`,
    }

    // Step 3: Sign EIP-3009 TransferWithAuthorization with private key (Web3Service)
    const now = Math.floor(Date.now() / 1000)

    steps.push({
      label: 'Step 3: Sign signature (Web3Service)',
      status: 'active',
      detail: 'Decoding PRIVATE_KEY_ENCODE and signing...',
    })

    const { from, nonce, signature } = await Web3Service.signTransferWithAuthorization({
      to: requirement.payTo,
      value: BigInt(requirement.amount ?? '0'),
      validAfter: BigInt(0),
      validBefore: BigInt(now + requirement.maxTimeoutSeconds),
      domain: {
        name: (requirement.extra?.name as string) ?? 'USD Coin',
        version: (requirement.extra?.version as string) ?? '2',
        chainId: resolvedChainId,
        verifyingContract: requirement.asset,
      },
    })

    steps[steps.length - 1] = {
      label: 'Step 3: Sign signature (Web3Service)',
      status: 'success',
      detail: `Signed EIP-3009 by ${from}`,
    }

    steps.push({
      label: 'Step 4: Send PAYMENT-SIGNATURE header',
      status: 'active',
    })

    const paymentPayload: PaymentPayload = {
      x402Version: paymentRequired.x402Version,
      payload: {
        authorization: {
          from,
          to: requirement.payTo,
          value: requirement.amount,
          validAfter: '0',
          validBefore: (now + requirement.maxTimeoutSeconds).toString(),
          nonce,
        },
        signature,
      },
      accepted: requirement,
      resource: paymentRequired.resource,
      extensions: paymentRequired.extensions,
    }
    const paymentHeader = base64Encode(JSON.stringify(paymentPayload))

    const paidRes = await fetch(url, {
      method: 'GET',
      headers: {
        'PAYMENT-SIGNATURE': paymentHeader,
      },
    })

    if (!paidRes.ok) {
      const errorText = await paidRes.text()

      console.log({ errorText, paidRes })

      throw new Error(`Payment failed: ${paidRes.status} ${errorText}`)
    }

    steps[steps.length - 1] = {
      label: 'Step 4: Send PAYMENT-SIGNATURE header',
      status: 'success',
      detail: `HTTP ${paidRes.status} - Payment successful`,
    }

    const header: Record<string, string> = {}

    paidRes.headers.forEach((value, key) => {
      header[key] = value
    })

    const data = await paidRes.json()

    steps.push({
      label: 'Step 5: Receive result',
      status: 'success',
      detail: JSON.stringify(data),
      header,
    })

    return steps
  } catch (err: any) {
    steps.push({
      label: 'Error',
      status: 'error',
      detail: JSON.stringify(err),
    })

    return steps
  }
}

export const GET = async (request: NextRequest) => {
  const results = await payForEndpoint()

  return NextResponse.json({ status: 'ok', results })
}
