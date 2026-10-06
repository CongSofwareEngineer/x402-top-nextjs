# Smart7702: header account, dismiss 7702, rà lại upgrade

- Ngày: 2026-10-05
- Phạm vi: smart7702 (trang `/smart7702`, hook `useERC7702`)

## Mục đích
- Header hiển thị account đang connect (địa chỉ rút gọn + network) và nút Disconnect.
- Cho phép user bỏ dùng 7702 (quay lại EOA thường).
- Sửa luồng upgrade lên 7702 cho chắc chắn hơn.

## Luồng xử lý
1. Header: lấy `address`/`chainId` từ `useERC7702`, nút Disconnect gọi `useDisconnect` của wagmi (AppKit wagmi adapter tự sync). Khi disconnect thì reset `callsId` để không còn hiện batch của account cũ.
2. Upgrade (`upgrade()`):
   - Đọc `atomic.status` qua `useCapabilities` (EIP-5792): `ready` = ví có thể upgrade, `supported` = đã là smart account, `unsupported` = không làm được → disable nút.
   - Chặn trước khi gửi: chain không hỗ trợ, đã upgrade, đang delegate cho contract khác (MetaMask không ghi đè delegation lạ).
   - Gửi self-call rỗng với `forceAtomic` → ví upgrade + chạy call trong cùng 1 tx type-4. Khi status `success` thì refetch bytecode + capabilities.
   - Card Upgrade chỉ hiện khi EOA chưa delegate cho contract nào.
3. Dismiss (`checkDismissed()`):
   - Gỡ delegation cần 1 authorization trỏ về `address(0)` do key của EOA ký. Ví browser (MetaMask, WalletConnect) KHÔNG cho dapp xin ký authorization, nên dapp không tự gỡ được.
   - Card "Stop using EIP-7702" (hiện khi có delegate) hướng dẫn user switch back trong ví, sau đó bấm nút để đọc lại code của EOA và báo kết quả.

## File liên quan
- `hooks/useERC7702.ts` — thêm `atomicStatus`, `checkDismissed`, `disconnect`, `isRefreshingDelegation`; guard trong `upgrade`; `callsError` chỉ còn lỗi của status (lỗi sendCalls hiển thị ở action gây ra, tránh hiện 2 lần).
- `app/smart7702/page.tsx` — component `Header`, `DismissPanel`, điều kiện hiện card Upgrade.

## Constants / Translation keys mới
- Không có.

## Lưu ý
- Repo hiện chưa có `useLanguage`/file ngôn ngữ, text trên trang vẫn hardcode như phần còn lại của trang — cần chuyển sang `translate()` khi có hệ thống ngôn ngữ.
- Nếu muốn gỡ 7702 ngay trong dapp thì chỉ làm được với local account (private key, `signAuthorization` của viem) — không áp dụng cho ví browser.
