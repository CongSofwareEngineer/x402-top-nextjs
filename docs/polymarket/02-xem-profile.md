# Xem profile

- Cập nhật: 2026-10-05
- Phạm vi: Profile tab (phần thông tin tài khoản và các thẻ số dư)

## Mục đích

Hiển thị tài khoản Polymarket của user đang connect: ví nào, profile công khai, tổng tài sản, tiền mặt, số dư ví ngoài và lãi/lỗ.

## Luồng xử lý

### 1. Tìm account wallet của user

`resolveAccountWallet(eoa)` (`services/polymarket/wallet/index.ts`), qua hook `usePolyMarketAccountWallet()`:

1. Chạy song song:
   - `getProfileWallet(eoa)`: lấy `proxyWallet` từ Gamma `/public-profile?address=<eoa>` (404 thì trả `null`).
   - `deriveDepositWallet(eoa)`: tính địa chỉ Deposit Wallet bằng CREATE2 (factory `DepositWalletFactory`). Factory có `beacon()` thì dùng công thức beacon, trừ khi bản UUPS đã deploy.
   - `deriveSafeWallet(eoa)`: tính địa chỉ Gnosis Safe cũ.
2. Kiểm tra `getCode` để biết ví nào đã deploy.
3. Chọn ví theo thứ tự:
   1. `proxyWallet` của Gamma, nếu trùng Safe hoặc Deposit Wallet
   2. Deposit Wallet đã deploy
   3. Safe đã deploy
   4. Deposit Wallet chưa deploy (tài khoản mới, cần Create wallet)
4. Kết quả `{ address, type: 'DEPOSIT_WALLET' | 'SAFE', deployed }` được cache vĩnh viễn (`staleTime: Infinity`) theo EOA.

Mọi hook bên dưới đều dùng `address` này (`usePolyMarketWalletAddress()`), **không dùng EOA**.

### 2. Profile công khai

`usePolyMarketProfile()` gọi `getProfileByAddress(wallet)` (`services/polymarket/gamma`). Chỉ chạy khi ví **đã deploy**.

- Chạy song song (`Promise.allSettled`):
  - Gamma `/public-profile?address=<wallet>`: tên, pseudonym, ảnh, bio, X, `verifiedBadge`.
  - Bridge `POST /deposit` (header `X-Builder-Code`): địa chỉ nạp tiền (`bridge.address.evm/svm/btc/tron`), xem [03-nap-tien.md](03-nap-tien.md).
- Tài khoản mới chưa có profile thì Gamma trả 404. Đây là bình thường: kết quả vẫn có `proxyWallet` + `bridge`.
- Cả 2 request đều lỗi thì trả `null`, hook fallback về `{ proxyWallet: wallet }`.

Card profile hiển thị:
- Tên: `name` → `pseudonym` → địa chỉ ví rút gọn `0x1234...abcd`.
- Ảnh: `profileImage`, nếu không có thì hiện chữ cái đầu.
- `Joined DD/MM/YYYY` (`stats.joinDate` là epoch **giây**, nhân 1000) · số trades · link ví trên Polygonscan.

### 3. Các thẻ số dư

| Thẻ | Công thức | Nguồn |
| --- | --- | --- |
| **Portfolio** | `positionsValue + cash` | xem 2 dòng dưới |
| └ positionsValue | `portfolio.value`, fallback = tổng `currentValue` của positions | Data `/v2/value` (chỉ tính positions đang mở) |
| └ subtitle | `$X in N active positions`, N = positions có `redeemable = false` | Data `/v2/positions?status=OPEN` |
| **Cash** | Số dư pUSD của account wallet | On-chain `pUSD.balanceOf(wallet)` (`getCashBalance`) |
| **Wallet Balance** | Số dư USDC của **EOA** trên chain đang connect | `useWalletBalance()`, token theo `USDC_BY_CHAIN` |
| **Profit/Loss** | `allTimePnl.economicPnl` (fallback `realized + unrealized`), kèm volume | Data `/v2/user-stats` |

- Portfolio giống polymarket.com: positions + cash (vì `/v2/value` không tính cash).
- Economic PnL = PnL positions + rebates/rewards, giống con số Profit/Loss trên polymarket.com.
- Wallet Balance: chain không có USDC trong `USDC_BY_CHAIN` (hoặc chưa cấu hình trong wagmi) thì hiện `—` và `No USDC on <chain>`. Có nút Refresh.
- User mới chưa giao dịch thì `/v2/user-stats` trả `data: null`, PnL hiện `+$0.00`.

### 4. Các phần khác trong Profile tab

| Phần | Hiện khi | Docs |
| --- | --- | --- |
| Positions | Ví đã deploy | [07-positions-claim.md](07-positions-claim.md) |
| Card onboarding | Chưa xong onboarding | [01-create-wallet.md](01-create-wallet.md) |
| Deposit | Ví đã deploy | [03-nap-tien.md](03-nap-tien.md) |
| Withdraw | Ví đã deploy | [04-rut-tien.md](04-rut-tien.md) |
| Recent Transfers | Có giao dịch ở địa chỉ nạp | [03-nap-tien.md](03-nap-tien.md) |

Chưa connect ví thì cả tab chỉ hiện màn "Connect Wallet".

## Tần suất cập nhật

| Hook | staleTime | refetchInterval |
| --- | --- | --- |
| `usePolyMarketAccountWallet` | ∞ | — |
| `usePolyMarketProfile` | 10 phút | — |
| `usePolyMarketPortfolio`, `usePolyMarketPositions`, `usePolyMarketCashBalance` | 30s | 60s |
| `usePolyMarketUserStats` | 1 giờ | — |
| `useWalletBalance` | 30s | 60s |

Sau khi mua/bán/claim, các query liên quan được invalidate ngay và thêm 1 lần sau 5s (xem [06-mua-ban.md](06-mua-ban.md)).

## File liên quan

- `component/polymarket/ProfileTab.tsx`: UI Profile, các thẻ số dư
- `hooks/polymarket/account.ts`: `usePolyMarketAccountWallet`, `usePolyMarketWalletAddress`, `usePolyMarketProfile`, `usePolyMarketPortfolio`, `usePolyMarketPositions`, `usePolyMarketCashBalance`, `usePolyMarketUserStats`
- `hooks/useWalletBalance.ts`: số dư USDC của EOA
- `services/polymarket/wallet/index.ts`: `resolveAccountWallet`, `deriveDepositWallet`, `deriveSafeWallet`, `getCashBalance`
- `services/polymarket/gamma/index.ts`: `getProfileByAddress`, `getProfileWallet`
- `services/polymarket/data/index.ts`: `getPortfolioValue`, `getPositions`, `getUserStats`

## Constants

- `CONTRACTS.DepositWalletFactory`, `CONTRACTS.DepositWalletImplementation`, `CONTRACTS.SafeFactory`, `SAFE_INIT_CODE_HASH`, `ERC1967`, `FACTORY_BEACON_SELECTOR`
- `PUSD_ADDRESS`, `TOKEN_DECIMALS`, `BUILDER_CODE`, `EXPLORERS.POLYGON`
- Query key: `ACCOUNT_WALLET`, `PROFILE`, `PORTFOLIO_VALUE`, `POSITIONS`, `CASH_BALANCE`, `USER_STATS`

## Lưu ý

- Cash là pUSD trong **account wallet**, Wallet Balance là USDC trong **EOA**. Đây là 2 ví khác nhau, đừng nhầm.
- Account wallet được cache vĩnh viễn. Sau khi deploy, hook Create wallet tự ghi lại cache. Nếu ví được deploy từ nơi khác (VD polymarket.com) thì cần reload trang.
- Hàm `formatNumber` / `formatCurrency` trong `ProfileTab.tsx` là bản riêng của file này, khác với `component/polymarket/format.ts`.
