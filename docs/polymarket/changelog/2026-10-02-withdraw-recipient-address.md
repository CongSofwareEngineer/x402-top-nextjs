# Nhập địa chỉ nhận khi Withdraw

- Ngày: 2026-10-02
- Phạm vi: polymarket / Profile — Withdraw USDC

## Mục đích
Trước đây `recipientAddr` khi tạo withdrawal destination luôn là ví đang login. Giờ người dùng có thể nhập địa chỉ nhận khác; nếu để trống thì vẫn mặc định là ví đang login.

## Luồng xử lý
1. Form Withdraw có thêm input "Recipient address" (placeholder hiển thị địa chỉ ví đang login).
2. Địa chỉ nhận thực tế = giá trị input (đã trim), nếu rỗng thì fallback về `address` của ví login — chỉ với chain EVM.
3. Chain non-EVM (Solana, Bitcoin, Tron… theo `BRIDGE_ADDRESS_TYPE_BY_CHAIN`) không fallback được (ví login là EVM) → bắt buộc nhập.
4. Validate: chain EVM dùng `isAddress` của viem; chain non-EVM chỉ kiểm tra không rỗng (bridge API tự validate). Có lỗi → disable nút tạo destination.
5. Khi đổi chain hoặc đổi địa chỉ nhận → `reset()` kết quả mutation cũ để không hiển thị withdrawal address của cấu hình trước (tránh gửi pUSD nhầm destination).
6. Nút "Use connected wallet" xoá input để quay về địa chỉ mặc định.
7. `POST /withdraw` luôn gửi header `X-Builder-Code` (mặc định `BUILDER_CODE`, có thể override qua `params.builderCode`) — trước đây header chỉ gửi khi truyền `builderCode`, mà không nơi nào truyền nên request thiếu attribution.
8. **Sửa lỗi withdraw không về tiền:** `POST /withdraw` chỉ tạo địa chỉ bridge, không chuyển tiền. Trước đây app dừng ở bước này (chỉ hiện địa chỉ để copy), mà Polymarket wallet là ví smart contract nên user không tự gửi pUSD được → tiền không bao giờ được rút.
9. Luồng mới (`useWithdraw`), 1 nút "Withdraw":
   - Gọi `createWithdrawalAddress` với `address` = Polymarket wallet (`onboarding.wallet`, theo docs: "Source Polymarket wallet address on Polygon").
   - Gọi `transferToBridge` → `client.transferErc20` của SDK `@polymarket/client`: chuyển `amount` pUSD tới `address.evm` (gasless qua relayer, 1 chữ ký), chờ settle, trả về tx hash.
   - Refetch Cash/Portfolio; hiển thị link tx Polygonscan + trạng thái bridge (`GET /status/{address.evm}`).
10. Ô nhập số tiền (pUSD) + nút Max; validate: > 0, ≥ `minCheckoutUsd` của chain đích, ≤ số dư Cash.

## File liên quan
- `component/polymarket/ProfileTab.tsx` — UI input, logic chọn/validate recipient, reset destination cũ.
- `services/polymarket/bridge/index.ts` — `createWithdrawalAddress` gửi `X-Builder-Code` mặc định.
- `services/polymarket/trading/index.ts` — `transferToBridge` (chuyển pUSD tới địa chỉ bridge).
- `hooks/polymarket/bridge.ts` — `useWithdraw` (tạo địa chỉ bridge + chuyển pUSD).

## Constants / Translation keys mới
- Không có. Dùng lại `BRIDGE_ADDRESS_TYPE_BY_CHAIN`, `BUILDER_CODE`, `PUSD_ADDRESS`, `TOKEN_DECIMALS` từ `services/polymarket/constants.ts`, `EXPLORERS.POLYGON` từ `constants/polymarket.ts`.

## Lưu ý
- Project chưa có `useLanguage` / file ngôn ngữ, text mới đang hardcode tiếng Anh giống phần còn lại của `ProfileTab`. Cần chuyển sang `translate()` khi có hệ thống i18n.
- Địa chỉ non-EVM chưa được validate phía client.
- Nếu bước tạo địa chỉ thành công nhưng user huỷ chữ ký / transfer lỗi thì chưa có tiền nào bị chuyển — có thể bấm Withdraw lại.
- `useCreateWithdrawalAddress` vẫn được export nhưng UI không còn dùng.
