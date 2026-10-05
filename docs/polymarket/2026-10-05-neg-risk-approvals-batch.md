# Bước Approve chỉ ký 1 lần (gộp mọi approval vào 1 batch)

- Ngày: 2026-10-05
- Phạm vi: polymarket / onboarding (bước Approve)

## Mục đích
Trước đây bước Approve có thể bắt user ký tới 3 lần:
1. `client.setupTradingApprovals()`: batch approval của SDK, gồm auto-redeem
2. `client.approveErc20`: pUSD cho NegRiskAdapter
3. `client.approveErc1155ForAll`: Conditional Tokens cho NegRiskAdapter

Giờ tự dựng lại batch của SDK và gộp chung NegRiskAdapter vào 1 giao dịch gasless, nên **user chỉ ký 1 lần**.

## Luồng xử lý
1. `setupTradingApprovals(client, wallet, walletClient)`:
   1. `fetchTradingApprovalsState(wallet)` đọc on-chain:
      - `missing.erc20` / `missing.erc1155`: các approval SDK yêu cầu mà ví còn thiếu (gồm AutoRedeemOperator)
      - `negRiskAdapter.collateral` / `negRiskAdapter.conditionalTokens`
   2. Thêm NegRiskAdapter vào danh sách nếu còn thiếu: pUSD `amount = maxUint256`, CTF operator.
   3. Mỗi approval thành 1 call (encode bằng `encodeFunctionData` của viem):
      - ERC-20: `token.approve(spender, amount)`
      - ERC-1155: `token.setApprovalForAll(operator, true)`
   4. Nếu có call: `prepareGaslessTransaction(client, { calls, metadata: TRADING_APPROVALS_METADATA })` → `runGaslessWorkflow` (ký 1 lần) → `handle.wait()`.
   5. `updateBalanceAllowance(COLLATERAL)` để CLOB refresh cache allowance.
2. `runGaslessWorkflow(walletClient, workflow)` trả lời các yêu cầu của workflow bằng `signerFrom(walletClient)`:
   - `requestAddress` → `getAddress()`
   - `signGaslessTypedData` → `signTypedData(payload)`
   - `signGaslessMessage` → `signMessage(payload)`

   Cách xử lý giống driver nội bộ của SDK (SDK không export driver này).
3. `usePolymarketOnboarding` lấy `walletClient` từ `useWalletClient()` (wagmi) và truyền vào `setupTradingApprovals`.

Cách dựng batch giống hệt `prepareTradingApprovals` trong SDK 0.10.0 (đọc từ `dist/chunk-*.js`): lấy `missing`, map sang `approve` / `setApprovalForAll`, gửi 1 batch với metadata `"Trading setup approvals"`.

## File liên quan
- `services/polymarket/trading/index.ts`: thêm `runGaslessWorkflow`, viết lại `setupTradingApprovals` (thêm tham số `walletClient`, không gọi `client.setupTradingApprovals()` / `approveErc20` / `approveErc1155ForAll` nữa).
- `services/polymarket/constants.ts`: thêm `TRADING_APPROVALS_METADATA`.
- `hooks/polymarket/onboarding.ts`: truyền `walletClient` vào `setupTradingApprovals`.

## Constants / Translation keys mới
- `TRADING_APPROVALS_METADATA = 'Trading setup approvals'`: nhãn batch gửi lên relayer, giống SDK.

## Lưu ý
- Chỉ áp dụng cho ví Safe / Deposit Wallet (gasless). SDK có nhánh riêng cho ví EOA (gửi từng giao dịch), app không dùng loại ví này.
- Auto-redeem vẫn được bật vì nằm trong `missing` của SDK. Khi nâng SDK cần kiểm tra lại:
  - `missing` vẫn chứa AutoRedeemOperator
  - các `kind` của `GaslessWorkflowRequest` không đổi (gặp `kind` lạ sẽ throw lỗi, không bị treo)
- Nếu SDK sau này tự thêm NegRiskAdapter vào `missing`, batch sẽ approve trùng 1 lần. Không gây hại, có thể bỏ phần NegRiskAdapter tự thêm.
- Batch chỉ gồm các approval còn thiếu. Ví đã approve một phần thì batch ngắn hơn.
