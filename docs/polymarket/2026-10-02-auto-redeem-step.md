# Auto-redeem bật ngầm trong bước Approve

- Ngày: 2026-10-02
- Phạm vi: polymarket / onboarding (bước Approve)

## Mục đích
Khi market resolve, Polymarket tự đổi share thắng ra pUSD, user không cần bấm Claim (auto-redeem).

Quyền này là `setApprovalForAll` cho contract **AutoRedeemOperator** (`0xa1200000d0002264C9a1698e001292D00E1b00af`) trên 2 token:
- `ConditionalTokens` (CTF)
- `PositionManager` (protocol V2)

Yêu cầu: bật auto-redeem **ngầm** trong logic Approve, không thêm bước hay nút riêng.

## Luồng xử lý
1. User bấm "Approve all" → `setupTradingApprovals(client, wallet)`.
2. `client.setupTradingApprovals()` của SDK `@polymarket/client` (0.10.0) gửi 1 batch gasless gồm mọi approval giao dịch, **trong đó có sẵn 2 approval AutoRedeemOperator**. Vì vậy auto-redeem được bật cùng lúc mà không cần code thêm.
3. `fetchTradingApprovalsState` dùng `isFullyApproved` của SDK, nên ví còn thiếu approval auto-redeem sẽ vẫn ở bước Approve. Bấm lại thì SDK chỉ gửi phần còn thiếu.

## File liên quan
- `services/polymarket/trading/index.ts`: thêm comment ở `setupTradingApprovals` ghi rõ batch có auto-redeem
- `hooks/polymarket/onboarding.ts`: cập nhật comment của `approveAll`

## Constants / Translation keys mới
- Không có.

## Lưu ý
- Đã thử làm bước 4 "Enable auto-redeem" hiển thị riêng, sau đó bỏ theo yêu cầu: chỉ cần chạy ngầm trong Approve.
- Logic này phụ thuộc vào việc SDK gộp AutoRedeemOperator trong `setupTradingApprovals()`. Khi nâng SDK cần kiểm tra lại (tìm `autoRedeemOperator` trong `node_modules/@polymarket/client/dist`).
- Approval on-chain chỉ là điều kiện cần. Chưa xác nhận được backend Polymarket có tự redeem cho ví tạo qua builder của mình hay không, nên vẫn giữ tab **Claim** thủ công.
- `setApprovalForAll` cho phép operator chuyển mọi token kết quả của ví. Đây là contract chính chủ Polymarket nhưng quyền khá rộng.
