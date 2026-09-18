/** Builder API authentication config for relayer requests. */
export interface BuilderAuthConfig {
  apiKey: string
  passphrase: string
  secret: string
}

/** Response from GET /relay-payload. */
export interface RelayPayloadResponse {
  address: string
  nonce: string
}

/** Response from POST /submit. */
export interface SubmitResponse {
  transactionID: string
  state: string
}

/** Response from GET /transaction. */
export interface RelayerTransactionResponse {
  transactionID: string
  transactionHash: string | null
  proxyAddress?: string
  state: string
  error_msg?: string | null
  [key: string]: unknown
}

/** Result of deploying a Safe wallet. */
export interface DeploySafeResult {
  transactionHash: string | null
  proxyAddress?: string
  state: string
}
