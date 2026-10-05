# Create wallet (onboarding)

- Cập nhật: 2026-10-05
- Phạm vi: Profile tab → card "Set up your Polymarket account"

## Mục đích

Trước khi trade được, tài khoản cần làm xong 3 bước. User chỉ bấm **1 nút "Create wallet"**, app tự chạy lần lượt:

| # | Bước | Làm gì | User phải ký? |
| --- | --- | --- | --- |
| 1 | **Deploy** | Tạo ví Deposit Wallet trên Polygon (gasless) | Không |
| 2 | **Enable trading** | Tạo API key CLOB (login) | 1 chữ ký `ClobAuth` (EIP-712) |
| 3 | **Approve** | Cấp quyền cho các contract giao dịch, gồm NegRiskAdapter và auto-redeem, gộp trong 1 giao dịch gasless | 1 chữ ký |

Bước nào đã xong thì bỏ qua. Lỗi giữa chừng thì bấm lại, app chạy tiếp từ bước chưa xong.

## Trạng thái từng bước

`usePolymarketOnboarding()` (`hooks/polymarket/onboarding.ts`) tính `status`:

| Field | Đúng khi | Nguồn dữ liệu |
| --- | --- | --- |
| `isDeployed` | Contract ví đã có trên chain | `usePolyMarketAccountWallet()` → `resolveAccountWallet` (`getCode`) |
| `isTradingEnabled` | Có CLOB credentials đã lưu | `usePolymarketCredentials()` → `localStorage` |
| `isApproved` | Đủ mọi approval | `usePolyMarketTradingApprovals()` → `fetchTradingApprovalsState` |

`getOnboardingStep(status)` trả về bước đầu tiên chưa xong: `deploy` → `enable_trading` → `approve` → `done`.

- `currentStep !== 'done'`: hiện card onboarding ở Profile. Tab Trade hiện câu nhắc "Create your wallet in the Profile tab…" thay cho form đặt lệnh.
- `currentStep === 'done'`: ẩn card, cho phép mua/bán/claim.

## Luồng xử lý khi bấm "Create wallet"

Hàm: `createWallet` mutation trong `usePolymarketOnboarding`.

### 0. Kiểm tra

Thiếu `address` (EOA), `walletClient` hoặc địa chỉ account wallet thì báo lỗi `Wallet not connected`.

### Bước 1: Deploy (chỉ chạy khi `!isDeployed`)

1. Client gọi `requestDeployDepositWallet(address, '/api/polymarket/deploy')`. Đây là `POST` lên server của app, body `{ address }`.
2. Server (`app/api/polymarket/deploy/route.ts`) validate địa chỉ rồi gọi `deployDepositWallet` (`services/polymarket/relayer`):
   1. `POST relayer /submit` với `type: 'WALLET-CREATE'`, `to: DepositWalletFactory`, kèm header HMAC builder (`POLY_BUILDER_*`).
   2. Poll `GET /transaction?id=...` mỗi 3s, tối đa 90s, đến khi `STATE_CONFIRMED`. Gặp `STATE_FAILED` / `STATE_INVALID` hoặc hết giờ thì báo lỗi.
   3. Trả về `{ transactionHash, proxyAddress, state }`.
3. Client **tracking**: gọi lại `resolveAccountWallet(address)` cho đến khi `deployed = true` (xem phần Tracking bên dưới).
4. Ghi kết quả vào cache `ACCOUNT_WALLET`, invalidate `PROFILE`.

User không cần ký ở bước này: relayer trả gas và builder trả phí.

### Bước 2: Enable trading (login)

1. Gọi `getClient()` (`usePolymarketTradingClient`, `hooks/polymarket/session.ts`).
2. `useEnsurePolygon()`: nếu ví đang ở chain khác thì yêu cầu switch sang Polygon (137), vì domain EIP-712 dùng chainId 137 và đa số ví từ chối ký khi lệch chain.
3. `tradingSession.connect()` (`services/polymarket/trading`) tạo `SecureClient` của `@polymarket/client`:
   - Đã có credentials trong `localStorage` (key `polymarket_clob_credentials:<eoa>`) thì dùng lại, **không ký**.
   - Chưa có thì yêu cầu user ký `ClobAuth` 1 lần, SDK tạo hoặc derive API key CLOB (L2).
   - Credentials bị revoke thì SDK tự derive lại.
4. Lưu credentials vào `localStorage` và cache `CLOB_CREDENTIALS`, nên `isTradingEnabled = true`.

Client được cache theo `eoa:wallet:walletClient.uid`, các lần gọi sau dùng lại cùng instance. Builder auth của client đi qua `remoteBuilderSigning({ url: '/api/polymarket/builder-sign' })`, nên secret không lộ ra client.

### Bước 3: Approve (chỉ chạy khi `!isApproved`)

Hàm: `setupTradingApprovals(client, wallet, walletClient)` (`services/polymarket/trading/index.ts`).

1. `fetchTradingApprovalsState(wallet)` đọc on-chain (không cần ký):
   - `state` của SDK (`publicClient.fetchTradingApprovalsState`): danh sách `missing.erc20` / `missing.erc1155` mà SDK yêu cầu. Danh sách này **đã gồm AutoRedeemOperator**.
   - `negRiskAdapter` (app tự đọc thêm, vì SDK bỏ sót):
     - `pUSD.allowance(wallet, NegRiskAdapter) >= maxUint256 / 2`
     - `ConditionalTokens.isApprovedForAll(wallet, NegRiskAdapter)`
   - `isFullyApproved = state.isFullyApproved && negRiskAdapter.collateral && negRiskAdapter.conditionalTokens`
2. Gộp mọi approval còn thiếu thành danh sách call:
   - ERC-20: `token.approve(spender, amount)`. Nếu thiếu NegRiskAdapter thì thêm pUSD với `amount = maxUint256`.
   - ERC-1155: `token.setApprovalForAll(operator, true)`. Nếu thiếu NegRiskAdapter thì thêm Conditional Tokens.
3. Có call thì gửi **1 batch gasless**:
   - `prepareGaslessTransaction(client, { calls, metadata: 'Trading setup approvals' })`
   - `runGaslessWorkflow(walletClient, workflow)`: trả lời các yêu cầu của workflow (`requestAddress`, `signGaslessTypedData`, `signGaslessMessage`) bằng signer của ví. **User ký 1 lần.** Gặp `kind` lạ thì throw lỗi (không bị treo).
   - `handle.wait()`: chờ giao dịch settle.
4. `updateBalanceAllowance(COLLATERAL)`: bắt CLOB refresh cache allowance. Thiếu bước này thì CLOB vẫn đọc allowance cũ = 0 và từ chối lệnh.
5. Hook **tracking** `fetchTradingApprovalsState` cho đến khi `isFullyApproved = true`, rồi ghi vào cache `TRADING_APPROVALS`.

#### Vì sao phải approve NegRiskAdapter

Market neg-risk (event có nhiều lựa chọn loại trừ nhau) được CLOB kiểm tra allowance của **NegRiskAdapter** (`0xd91E…5296`). SDK `@polymarket/client` (đã kiểm tra đến 0.12.0) không approve contract này. Nếu thiếu, lệnh bị từ chối:

```
not enough balance / allowance: the allowance is not enough -> spender: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296, allowance: 0
```

- pUSD allowance: cần cho lệnh BUY.
- Conditional Tokens operator: cần cho lệnh SELL.

#### Auto-redeem

Danh sách `missing` của SDK có sẵn `setApprovalForAll` cho **AutoRedeemOperator** (`0xa1200000d0002264C9a1698e001292D00E1b00af`) trên `ConditionalTokens` và `PositionManager`. Vì vậy auto-redeem được bật **ngầm** trong bước Approve, không có nút riêng. Khi market resolve, Polymarket có thể tự đổi share thắng ra pUSD.

### Kết thúc

- Thành công: không refetch (cache đã đúng). Refetch ngay có thể đọc trúng RPC node chưa cập nhật.
- Lỗi: invalidate `TRADING_APPROVALS`, hiển thị `error.message` dưới checklist.
- Luôn reset `runningStep = null`.

## Tracking (chờ xác nhận on-chain)

Helper `trackUntil(read, isConfirmed, errorMessage)` trong `hooks/polymarket/onboarding.ts`:

- Gọi `read()` mỗi `ONBOARDING_TRACKING.INTERVAL_MS` (2s), tối đa `ONBOARDING_TRACKING.MAX_ATTEMPTS` (30) lần, tức khoảng 60s.
- `isConfirmed(value)` đúng thì trả về giá trị, quá số lần thì throw `errorMessage` để user bấm lại.

Lý do: RPC/API thường chậm vài block so với relayer. Trước đây chỉ invalidate rồi đọc ngay nên nhận về "chưa approve", kết quả bị cache 60s, nút vẫn hiện cho đến khi reload trang.

## UI (`OnboardingCard` trong `ProfileTab.tsx`)

- Checklist 3 bước: ✓ khi xong, highlight bước đang chạy (`runningStep`, nếu không chạy thì `currentStep`).
- Hiện địa chỉ ví và loại ví (`Deposit wallet` / `Polymarket wallet (Safe)`).
- Nút: `Create wallet`. Khi đang chạy, nút hiện label theo bước, VD `Approving tokens... (3/3)`.
- Nút disable khi đang load trạng thái hoặc đang chạy.

## File liên quan

- `hooks/polymarket/onboarding.ts`: `usePolymarketOnboarding`, `usePolyMarketTradingApprovals`, `trackUntil`
- `hooks/polymarket/session.ts`: `usePolymarketTradingClient`, `usePolymarketCredentials`, `useEnsurePolygon`, `tradingSession`
- `hooks/polymarket/account.ts`: `usePolyMarketAccountWallet`
- `services/polymarket/trading/index.ts`: `createTradingSession`, `fetchTradingApprovalsState`, `setupTradingApprovals`, `runGaslessWorkflow`, `getOnboardingStep`, `ONBOARDING_STEP`
- `services/polymarket/wallet/index.ts`: `requestDeployDepositWallet`, `resolveAccountWallet`
- `services/polymarket/relayer/index.ts`: `deployDepositWallet`, `buildBuilderHeaders` (server)
- `app/api/polymarket/deploy/route.ts`: route deploy
- `app/api/polymarket/builder-sign/route.ts`: route ký header builder cho SDK
- `component/polymarket/ProfileTab.tsx`: `OnboardingCard`

## Constants

- `POLYMARKET_ROUTES.DEPLOY`, `POLYMARKET_ROUTES.BUILDER_SIGN`
- `ONBOARDING_TRACKING.INTERVAL_MS`, `ONBOARDING_TRACKING.MAX_ATTEMPTS`
- `CONTRACTS.DepositWalletFactory`, `CONTRACTS.ConditionalTokens`, `CONTRACTS.NegRiskAdapter`, `PUSD_ADDRESS`
- `TRADING_APPROVALS_METADATA`, `CLOB_ASSET_TYPE`, `STORAGE_KEY_CLOB_CREDENTIALS`
- Query key: `ACCOUNT_WALLET`, `CLOB_CREDENTIALS`, `TRADING_APPROVALS`, `PROFILE`

## Lưu ý

- **Ví Safe cũ** đã deploy sẵn, nên nút chỉ chạy Enable trading + Approve.
- **Credentials lưu theo trình duyệt** (`localStorage`). Đổi trình duyệt hoặc xoá dữ liệu thì card hiện lại ở bước 2 và phải ký `ClobAuth` lại (không cần deploy/approve lại).
- `getClient` và `setupTradingApprovals` dùng địa chỉ ví **derive trước khi deploy**. Nếu relayer trả `proxyAddress` khác địa chỉ derive (bình thường không xảy ra) thì cần truyền địa chỉ mới vào client.
- Batch chỉ gồm approval **còn thiếu**. Ví đã approve một phần thì batch ngắn hơn. Đủ hết thì không gửi giao dịch, chỉ gọi `updateBalanceAllowance`.
- Khi **nâng SDK** `@polymarket/client` cần kiểm tra lại:
  - `missing` vẫn chứa AutoRedeemOperator (tìm `autoRedeemOperator` trong `node_modules/@polymarket/client/dist`).
  - Các `kind` của `GaslessWorkflowRequest` không đổi.
  - Nếu SDK tự thêm NegRiskAdapter thì batch approve trùng 1 lần (không hại), có thể bỏ phần app tự thêm.
- Chỉ hỗ trợ ví Safe / Deposit Wallet (gasless). SDK có nhánh riêng cho ví EOA, app không dùng.
- Approval on-chain chỉ là điều kiện cần cho auto-redeem. Chưa xác nhận backend Polymarket có tự redeem cho ví tạo qua builder của mình hay không, nên vẫn giữ nút **Claim** thủ công (xem [07-positions-claim.md](07-positions-claim.md)).
- `setApprovalForAll` cho AutoRedeemOperator cho phép contract này chuyển mọi outcome token của ví. Đây là contract của Polymarket nhưng quyền khá rộng.
- **TODO bảo mật**: `/api/polymarket/builder-sign` chưa xác thực người gọi, ai cũng xin được header builder đã ký.
