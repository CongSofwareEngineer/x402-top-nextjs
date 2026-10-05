# Nạp tiền (Deposit)

- Cập nhật: 2026-10-05
- Phạm vi: Profile tab → card "Deposit", bảng "Recent Transfers"

## Mục đích

User gửi token (USDC, ETH, SOL…) từ nhiều chain vào **địa chỉ nạp** của Polymarket Bridge. Bridge tự đổi sang pUSD và chuyển vào account wallet. Card chỉ hiển thị địa chỉ, **không gửi giao dịch nào**: user tự chuyển tiền từ ví của mình.

## Luồng xử lý

1. **Địa chỉ nạp**: lấy từ `usePolyMarketProfile()` → `profile.bridge.address`. Đây là kết quả `POST bridge /deposit` với `address = account wallet` (xem [02-xem-profile.md](02-xem-profile.md)). Bridge trả 1 địa chỉ cho mỗi loại chain: `evm`, `svm`, `btc`, `tron`.
2. **Danh sách token hỗ trợ**: `useSupportedAssets()` → `GET bridge /supported-assets`, cache 1 giờ. Token native (`0xeeee…`) được đổi thành zero address để hiện nhãn `Native`.
3. **Gom theo chain**: mỗi chip là 1 chain kèm số token của chain đó.
4. **Chain mặc định**: theo chain ví đang connect (`useAppKitNetwork`). Chain không được hỗ trợ thì chọn `All chains`. User bấm chip khác thì giữ lựa chọn đó.
5. **Chọn địa chỉ hiển thị**: `getDepositAddress(addresses, chainId)` (`services/polymarket/bridge`):
   - Chain có trong `BRIDGE_ADDRESS_TYPE_BY_CHAIN` thì dùng loại tương ứng: Solana → `svm`, Bitcoin → `btc`, Tron → `tron`, Lightning → `null` (không có địa chỉ, cần invoice).
   - Chain không có trong map là **EVM**, dùng `evm`.
   - `All chains` thì hiện địa chỉ EVM.
6. **Panel địa chỉ**: QR (thư viện `qrcode`), nút Copy, nút Explorer (`BRIDGE_CHAIN_EXPLORERS[chainId]`), cảnh báo chỉ gửi token có trong list.
7. **Tìm token**: lọc theo symbol, name hoặc address (không phân biệt hoa thường). Mỗi token hiện mức nạp tối thiểu `minCheckoutUsd`.

## Recent Transfers

- `useBridgeStatus(depositAddress)` → `GET bridge /status/<địa chỉ nạp EVM>`. Refetch mỗi 60s.
- Chỉ hiện bảng khi có giao dịch. Cột: chain nguồn (`fromChainId`), số tiền (`fromAmountBaseUnit / 1e6`), trạng thái.
- `/status` nhận **địa chỉ bridge đã nhận tiền**, không phải account wallet.

## File liên quan

- `component/polymarket/DepositCard.tsx`: UI deposit (chip chain, tìm token, QR)
- `component/polymarket/ProfileTab.tsx`: bảng Recent Transfers
- `hooks/polymarket/bridge.ts`: `useSupportedAssets`, `useBridgeStatus`
- `hooks/polymarket/account.ts`: `usePolyMarketProfile` (chứa địa chỉ nạp)
- `services/polymarket/bridge/index.ts`: `getSupportedAssets`, `getDepositAddress`, `getBridgeStatus`
- `services/polymarket/gamma/index.ts`: `getProfileByAddress` (gọi `POST /deposit`)

## Constants

- `BRIDGE_ADDRESS_TYPE_BY_CHAIN`, `BRIDGE_NON_EVM_CHAINS`, `NATIVE_TOKEN_PLACEHOLDER`, `BUILDER_CODE` (`services/polymarket/constants.ts`)
- `BRIDGE_CHAIN_EXPLORERS` (`constants/polymarket.ts`)
- Query key: `SUPPORTED_ASSETS`, `BRIDGE_STATUS`, `PROFILE`

## Lưu ý

- Card chỉ hiện khi ví **đã deploy**.
- Gửi dưới `minCheckoutUsd` có thể không được ghi nhận.
- Recent Transfers chỉ theo dõi địa chỉ nạp **EVM**. Giao dịch nạp qua Solana / Bitcoin / Tron chưa hiện ở bảng này.
- Số tiền trong Recent Transfers đang chia cứng `1e6` (giả định 6 decimals như USDC). Token khác decimals sẽ hiện sai.
- `getBridgeStatus` trả list rỗng nếu địa chỉ không phải dạng EVM `0x…40 hex`.
- Sau khi nạp, Cash cập nhật theo chu kỳ refetch (60s).
