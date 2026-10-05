# Polymarket — Tổng quan

- Cập nhật: 2026-10-05
- Phạm vi: toàn bộ module Polymarket (`/polymarket`)

Đọc file này trước, sau đó đọc file của logic cần sửa.

## Mục lục

| File | Nội dung |
| --- | --- |
| [01-create-wallet.md](01-create-wallet.md) | Nút **Create wallet**: Deploy → Enable trading → Approve (gồm NegRiskAdapter + auto-redeem) |
| [02-xem-profile.md](02-xem-profile.md) | Tìm ví Polymarket của user, profile, các thẻ Portfolio / Cash / Wallet Balance / Profit-Loss |
| [03-nap-tien.md](03-nap-tien.md) | Deposit: địa chỉ nạp qua bridge, chọn chain, QR, Recent Transfers |
| [04-rut-tien.md](04-rut-tien.md) | Withdraw: tạo địa chỉ bridge + chuyển pUSD, địa chỉ nhận |
| [05-danh-sach-market.md](05-danh-sach-market.md) | Tab Markets: category, sort, sort theo ngày hết hạn, tìm kiếm / dán link |
| [06-mua-ban.md](06-mua-ban.md) | Tab Trade: quote sổ lệnh, tối thiểu $1, slippage, lệnh FAK |
| [07-positions-claim.md](07-positions-claim.md) | Positions: bán nhanh, Claim / redeem, Closed |
| [08-lich-su.md](08-lich-su.md) | Tab History: Activity, badge Live/Ended, bấm để trade lại, Open Orders / huỷ lệnh |
| [09-format-hien-thi.md](09-format-hien-thi.md) | Format ngày (GMT+7), volume, giá ¢, % |
| [changelog/](changelog/) | Log thay đổi cũ theo ngày (chỉ để tra lịch sử, có thể đã lỗi thời) |

## Khái niệm cần nắm

- **EOA (signer)**: ví user connect qua Reown AppKit (MetaMask, Rabby…). Chỉ dùng để **ký**, không giữ tiền Polymarket.
- **Account wallet (ví Polymarket)**: ví smart contract trên Polygon, **giữ pUSD và positions**. Có 2 loại:
  - `DEPOSIT_WALLET`: tài khoản mới (tạo sau 04/05/2026), app tự deploy.
  - `SAFE`: Gnosis Safe cũ của tài khoản tạo trên polymarket.com trước đó, đã deploy sẵn.
- Mọi API Data / Gamma / Bridge và trading client đều phải dùng **địa chỉ account wallet**, không dùng EOA. Lấy địa chỉ qua `usePolyMarketWalletAddress()`.
- **pUSD**: token thế chấp dùng để trade (6 decimals, `PUSD_ADDRESS`). Số dư pUSD = Cash.
- **Gasless**: giao dịch on-chain (deploy, approve, redeem, chuyển pUSD) đi qua **relayer** của Polymarket. User chỉ ký, không trả gas.
- **Builder**: app được đăng ký builder với Polymarket. Builder secret chỉ nằm ở server, client xin chữ ký qua route `/api/polymarket/builder-sign`.

## Cấu trúc code

| Tầng | Thư mục | Ghi chú |
| --- | --- | --- |
| SDK | `services/polymarket/` | Không dùng React / React Query / `@/`. Chỉ phụ thuộc `viem` + `@polymarket/client`. |
| Hooks | `hooks/polymarket/` | Bọc SDK bằng React Query (`useQuery` / `useMutation`). |
| UI | `component/polymarket/`, `app/polymarket/page.tsx` | 4 tab: Markets, Trade, Profile, History. |
| Server | `app/api/polymarket/` | `builder-sign` (ký header builder), `deploy` (deploy Deposit Wallet). |

Trong `services/polymarket/`:

| Thư mục | Vai trò |
| --- | --- |
| `gamma/` | Gamma API: event, market, public profile |
| `data/` | Data API v2: portfolio, positions, activity, user stats |
| `clob/` | CLOB API: sổ lệnh |
| `bridge/` | Bridge API: tài sản hỗ trợ, địa chỉ nạp/rút, trạng thái |
| `market/` | Logic thuần: quote sổ lệnh, slippage, validate lệnh, trạng thái market |
| `wallet/` | Tính địa chỉ ví (CREATE2), resolve account wallet, số dư pUSD |
| `trading/` | Trading client (SDK `@polymarket/client`), approvals, đặt/huỷ lệnh, redeem, chuyển pUSD |
| `relayer/` | **Chỉ chạy ở server**: HMAC builder, deploy qua relayer. Không import ở client. |

## API dùng

| API | Host (`API_POLYMARKET`) | Dùng cho |
| --- | --- | --- |
| Gamma | `gamma-api.polymarket.com` | Danh sách event/market, profile |
| Data v2 | `data-api.polymarket.com` | Portfolio, positions, activity, stats |
| CLOB | `clob.polymarket.com` | Sổ lệnh, đặt/huỷ lệnh (qua SDK) |
| Bridge | `bridge.polymarket.com` | Nạp/rút cross-chain |
| Relayer | `relayer-v2.polymarket.com` | Giao dịch gasless |

## Env (server)

`POLYMARKET_BUILDER_API_KEY`, `POLYMARKET_BUILDER_PASSPHRASE`, `POLYMARKET_BUILDER_SECRET` (lấy ở Polymarket → Settings → Builders). Thiếu biến nào thì `deploy` và `builder-sign` trả lỗi 500.

## Constants chính

- `services/polymarket/constants.ts`: protocol (API host, contract, `PUSD_ADDRESS`, `MIN_MARKET_ORDER_USD`, `MARKET_ORDER_SLIPPAGE`, `BUILDER_CODE`…).
- `constants/polymarket.ts`: UI (route, category, sort, slippage, timezone, explorer…).
- `constants/reactQuery.ts`: `REACT_QUERY_POLY_MARKET` (toàn bộ query key của module).

## Lưu ý chung

- Module Polymarket **chưa dùng `translate()`**: text UI đang hardcode tiếng Anh. Khi có file ngôn ngữ cần chuyển sang `useLanguage`.
- Khi sửa logic: cập nhật file docs tương ứng ở trên và thêm 1 log ngắn vào `changelog/<YYYY-MM-DD>-<slug>.md` (rule 5 trong `CLAUDE.md`).
