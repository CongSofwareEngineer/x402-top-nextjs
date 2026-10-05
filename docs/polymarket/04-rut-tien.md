# Rút tiền (Withdraw)

- Cập nhật: 2026-10-05
- Phạm vi: Profile tab → card "Withdraw USDC"

## Mục đích

Rút pUSD từ account wallet ra token (thường là USDC) trên chain khác qua Polymarket Bridge. User chọn chain đích, địa chỉ nhận, số tiền, rồi bấm **1 nút "Withdraw"** (1 chữ ký gasless).

## Vì sao cần 2 bước

`POST bridge /withdraw` **chỉ tạo địa chỉ bridge**, không chuyển tiền. Account wallet là ví smart contract nên user không tự gửi pUSD bằng ví thường được. App phải tự chuyển pUSD tới địa chỉ bridge qua relayer.

Trước đây app dừng ở bước tạo địa chỉ (chỉ hiện địa chỉ để copy), nên tiền không bao giờ được rút. Đã sửa bằng `useWithdraw`.

## Luồng xử lý

### 1. Form

1. **Destination chain**: select từ `useSupportedAssets()`. Mỗi chain lấy 1 token: ưu tiên `USDC`, không có thì lấy token đầu tiên. Mặc định chain `8453` (Base).
2. **Recipient address**:
   - Chain **EVM** (không có trong `BRIDGE_ADDRESS_TYPE_BY_CHAIN`): để trống thì mặc định là EOA đang connect. Nhập địa chỉ khác thì validate bằng `isAddress` (viem). Nút "Use connected wallet" xoá input để quay về mặc định.
   - Chain **non-EVM** (Solana, Bitcoin, Tron): bắt buộc nhập, vì EOA là ví EVM. Chỉ kiểm tra không rỗng, còn lại để bridge validate.
3. **Amount (pUSD)**: nút `Max` điền toàn bộ Cash. Validate:
   - `> 0`
   - `>= minCheckoutUsd` của token đích
   - `<= Cash` (số dư pUSD)
4. Đổi chain hoặc đổi địa chỉ nhận thì `resetWithdrawal()` xoá kết quả cũ, tránh hiển thị (và gửi nhầm) theo cấu hình trước.
5. Nút Withdraw disable khi đang chạy, thiếu ví/asset, hoặc có lỗi validate.

### 2. Bấm Withdraw (`useWithdraw`, `hooks/polymarket/bridge.ts`)

1. `createWithdrawalAddress({ address, toChainId, toTokenAddress, recipientAddr })`:
   - `POST bridge /withdraw`, header `X-Builder-Code` (mặc định `BUILDER_CODE`).
   - `address` = **account wallet** (nguồn pUSD trên Polygon), không phải EOA.
   - Trả về `address.evm`: địa chỉ bridge trên Polygon.
2. `getClient()`: lấy trading client (switch Polygon nếu cần, xem [01-create-wallet.md](01-create-wallet.md)).
3. `transferToBridge(client, { bridgeAddress, amount })` (`services/polymarket/trading`):
   - `client.transferErc20({ tokenAddress: pUSD, recipientAddress: bridgeAddress, amount: parseUnits(amount, 6) })`: giao dịch gasless qua relayer, **user ký 1 lần**.
   - `handle.wait()` chờ settle, trả về tx hash.
4. Bridge tự chuyển tiếp sang chain đích tới `recipientAddr`.
5. Xong (thành công hay lỗi) thì invalidate `CASH_BALANCE`, `PORTFOLIO_VALUE`.

### 3. Theo dõi kết quả

- Hiện link tx trên Polygonscan (`EXPLORERS.POLYGON/tx/<hash>`).
- `useBridgeStatus(bridgeAddress)` → `GET bridge /status/<bridgeAddress>`, refetch 60s. Hiện `status` của giao dịch đầu tiên, chưa có thì hiện `waiting`.

## File liên quan

- `component/polymarket/ProfileTab.tsx`: form Withdraw, validate địa chỉ/số tiền
- `hooks/polymarket/bridge.ts`: `useWithdraw`, `useBridgeStatus`, `useSupportedAssets`, `useCreateWithdrawalAddress`
- `services/polymarket/bridge/index.ts`: `createWithdrawalAddress`, `getBridgeStatus`
- `services/polymarket/trading/index.ts`: `transferToBridge`

## Constants

- `BRIDGE_ADDRESS_TYPE_BY_CHAIN`, `BUILDER_CODE`, `PUSD_ADDRESS`, `TOKEN_DECIMALS` (`services/polymarket/constants.ts`)
- `EXPLORERS.POLYGON` (`constants/polymarket.ts`)
- Query key: `CASH_BALANCE`, `PORTFOLIO_VALUE`, `BRIDGE_STATUS`, `SUPPORTED_ASSETS`

## Lưu ý

- Form hiện khi ví **đã deploy**, không cần xong Approve. Nếu chưa Enable trading thì `getClient()` sẽ yêu cầu ký `ClobAuth` trước.
- Tạo địa chỉ thành công nhưng user huỷ chữ ký hoặc transfer lỗi thì **chưa có tiền nào bị chuyển**, có thể bấm lại.
- Địa chỉ non-EVM chưa được validate phía client.
- Chain mặc định `8453` đang hardcode trong `useState` của `ProfileTab`, nên chuyển vào constants.
- `useCreateWithdrawalAddress` vẫn được export nhưng UI không còn dùng.
