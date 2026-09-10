export async function GET(req: Request) {
  const query = new URLSearchParams(req.url.split('?')[1])
  const paymentHeader = query.get('paymentSignature') || query.get('PAYMENTSIGNATURE')

  const DOMAIN = process.env.DOMAIN_API

  const url = `${DOMAIN}/api/send-token`

  if (paymentHeader) {
    const paidRes = await fetch(url, {
      method: 'GET',
      headers: {
        'PAYMENT-SIGNATURE': String(paymentHeader),
      },
    })

    console.log({ paidRes })

    return paidRes
  } else {
    const res = await fetch(url)

    return res
  }
}
