# Gộp onboarding thành 1 nút "Create wallet"

- Ngày: 2026-10-05
- Phạm vi: polymarket / onboarding

## Mục đích
Trước đây tài khoản mới phải bấm lần lượt 3 nút: Deploy → Enable trading (login) → Approve all (auto-redeem đã chạy ngầm trong Approve). Giờ gộp lại thành 1 nút **Create wallet**, chạy hết các bước theo thứ tự.

## Luồng xử lý
1. User bấm "Create wallet" → `createWallet.run()` trong `usePolymarketOnboarding`.
2. Nếu ví chưa deploy: gọi `requestDeployDepositWallet` (gasless, không cần ký), rồi **tracking** `resolveAccountWallet` cho đến khi contract ví có trên chain (`deployed = true`). Sau đó ghi vào cache `ACCOUNT_WALLET` và invalidate `PROFILE`.
3. Login: `getClient()` dùng lại CLOB credentials đã lưu, nếu chưa có thì yêu cầu ký `ClobAuth` 1 lần. Credentials được ghi vào cache `CLOB_CREDENTIALS`.
4. Nếu chưa approve đủ: `setupTradingApprovals` gửi các approval còn thiếu (gồm NegRiskAdapter và AutoRedeemOperator, tức là bật auto-redeem), rồi **tracking** `fetchTradingApprovalsState` cho đến khi `isFullyApproved = true`. Sau đó ghi vào cache `TRADING_APPROVALS`.
5. Mỗi bước chỉ chuyển sang bước tiếp khi trạng thái thật đã được xác nhận. Tracking đọc lại mỗi `ONBOARDING_TRACKING.INTERVAL_MS` (2s), tối đa `MAX_ATTEMPTS` (30) lần, quá thì báo lỗi để user bấm lại.
6. Thành công: không refetch (cache đã đúng). Lỗi: invalidate `TRADING_APPROVALS`. Luôn reset `runningStep`.
7. Bước nào đã xong thì bỏ qua. Nếu lỗi giữa chừng, bấm lại sẽ chạy tiếp từ bước chưa xong.

UI: checklist 3 bước vẫn được giữ để hiển thị tiến độ (✓ khi xong, highlight bước đang chạy). Nút hiện label theo bước, ví dụ `Approving tokens... (3/3)`.

## File liên quan
- `constants/polymarket.ts`: thêm `ONBOARDING_TRACKING` (chu kỳ và số lần tracking).
- `hooks/polymarket/onboarding.ts`: thêm helper `trackUntil`; thay 3 mutation `deploy` / `enableTrading` / `approveAll` bằng 1 mutation `createWallet`; trả về `createWallet: { run, isPending, error, runningStep }` thay cho `steps`.
- `component/polymarket/ProfileTab.tsx`: `OnboardingCard` chỉ còn 1 nút "Create wallet", lỗi hiển thị dưới checklist.
- `component/polymarket/TradeTab.tsx`: đổi câu nhắc thành "Create your wallet in the Profile tab to place orders."

## Constants / Translation keys mới
- `ONBOARDING_TRACKING.INTERVAL_MS`, `ONBOARDING_TRACKING.MAX_ATTEMPTS`. Dùng lại `ONBOARDING_STEP` để theo dõi bước đang chạy.

## Lưu ý
- Bug đã sửa: trước đây sau khi approve chỉ invalidate rồi đọc lại ngay. RPC/API chưa kịp cập nhật nên trả về "chưa approve", kết quả bị cache 60s, nút "Create wallet" vẫn hiện cho đến khi reload trang. Giờ tracking đến khi xác nhận xong rồi mới ghi cache.
- Bỏ `fresh: true` khi login: `getClient()` tự ký mới nếu chưa có credentials. Trường hợp credentials bị revoke vẫn được SDK derive lại.
- Ví Safe (legacy) đã deploy sẵn thì nút chỉ chạy Login + Approve.
- `getClient` và `setupTradingApprovals` dùng địa chỉ ví derive trước khi deploy. Nếu relayer trả `proxyAddress` khác địa chỉ derive (bình thường không xảy ra) thì cần truyền địa chỉ mới vào client.
- Module polymarket hiện chưa dùng `translate()` (chưa có file ngôn ngữ trong `public/assets/language/`), nên text mới vẫn hardcode giống phần còn lại của file.
