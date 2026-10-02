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

## File liên quan
- `component/polymarket/ProfileTab.tsx` — UI input, logic chọn/validate recipient, reset destination cũ.

## Constants / Translation keys mới
- Không có. Dùng lại `BRIDGE_ADDRESS_TYPE_BY_CHAIN` từ `@/services/polymarket`.

## Lưu ý
- Project chưa có `useLanguage` / file ngôn ngữ, text mới đang hardcode tiếng Anh giống phần còn lại của `ProfileTab`. Cần chuyển sang `translate()` khi có hệ thống i18n.
- Địa chỉ non-EVM chưa được validate phía client.
