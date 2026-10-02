# Approve NegRiskAdapter cho market neg-risk

- Ngày: 2026-10-02
- Phạm vi: polymarket / onboarding (bước Approve), trading

## Mục đích
Đặt lệnh trên market neg-risk (event nhiều lựa chọn) bị CLOB từ chối:

```
not enough balance / allowance: the allowance is not enough -> spender: 0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296, allowance: 0
```

`0xd91E…5296` là **NegRiskAdapter**. `client.setupTradingApprovals()` của SDK `@polymarket/client` (đã kiểm tra 0.10.0 → 0.12.0) không approve contract này, và `fetchTradingApprovalsState` cũng không kiểm tra nó → UI báo "đã approve" nhưng lệnh vẫn lỗi.

## Luồng xử lý
1. `fetchTradingApprovalsState(wallet)`: ngoài state của SDK, đọc on-chain thêm:
   - `pUSD.allowance(wallet, NegRiskAdapter)`
   - `ConditionalTokens.isApprovedForAll(wallet, NegRiskAdapter)`
   → `isFullyApproved` chỉ `true` khi đủ cả hai. User cũ thiếu quyền sẽ thấy lại bước Approve.
2. `setupTradingApprovals(client, wallet)` (bước Approve):
   1. `client.setupTradingApprovals()` — batch approve của SDK.
   2. Nếu thiếu → `client.approveErc20` (pUSD, `max`) cho NegRiskAdapter.
   3. Nếu thiếu → `client.approveErc1155ForAll` (Conditional Tokens) cho NegRiskAdapter (cần cho lệnh SELL).
   4. `updateBalanceAllowance(COLLATERAL)` — bắt CLOB refresh cache allowance, nếu không CLOB vẫn đọc allowance cũ = 0.

## File liên quan
- `services/polymarket/constants.ts` — thêm địa chỉ contract + `CLOB_ASSET_TYPE`
- `services/polymarket/trading/index.ts` — `fetchNegRiskAdapterApprovals`, `fetchTradingApprovalsState`, `setupTradingApprovals`
- `services/polymarket/wallet/index.ts` — export `polygonClient` để đọc on-chain
- `services/polymarket/index.ts` — export `setupTradingApprovals`
- `hooks/polymarket/onboarding.ts` — `approveAll` gọi `setupTradingApprovals`

## Constants / Translation keys mới
- `CONTRACTS.ConditionalTokens`, `CONTRACTS.NegRiskAdapter`
- `CLOB_ASSET_TYPE`

## Lưu ý
- Mỗi approve NegRiskAdapter là 1 giao dịch gasless riêng (thêm tối đa 2 chữ ký), chỉ chạy khi còn thiếu.
- Allowance được coi là đủ khi `>= maxUint256 / 2` (approve `max`).
- Khi SDK bổ sung NegRiskAdapter vào `setupTradingApprovals`, có thể bỏ phần bổ sung này.
