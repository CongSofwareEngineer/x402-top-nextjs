import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const query = new URLSearchParams(req.url.split('?')[1])
  const paymentHeader =
    req.headers.get('payment-signature') ||
    req.headers.get('Payment-signature') ||
    req.headers.get('PAYMENT-SIGNATURE') ||
    query.get('paymentSignature') ||
    query.get('PAYMENTSIGNATURE')

  const DOMAIN = process.env.DOMAIN_API

  const url = `${DOMAIN}/api/report`

  if (paymentHeader) {
    const paidRes = await fetch(url, {
      method: 'GET',
      headers: {
        'PAYMENT-SIGNATURE': paymentHeader,
      },
    })

    console.log({ paidRes })
    if (!paidRes.ok) {
      return paidRes
    }

    return NextResponse.json({ status: 'ok', results: await paidRes.json() })
  } else {
    const res = await fetch(url)

    return res
  }
}
