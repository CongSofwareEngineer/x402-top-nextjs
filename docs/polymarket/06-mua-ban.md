# Mua bán (Trade tab)

- Cập nhật: 2026-10-05
- Phạm vi: Trade tab: đặt lệnh BUY / SELL theo giá thị trường

## Mục đích

User chọn market + outcome (Yes/No), nhập số tiền, xem trước giá khớp, rồi đặt **lệnh market** (khớp ngay với sổ lệnh). App không có lệnh limit treo.

## Điều kiện

- Onboarding xong (`currentStep === 'done'`, xem [01-create-wallet.md](01-create-wallet.md)). Nếu chưa, form đặt lệnh được thay bằng câu nhắc "Create your wallet in the Profile tab to place orders."
- Market phải là Yes/No đang mở. Không có thì hiện "This event has no open Yes/No market."

## Luồng xử lý

### 1. Mở tab Trade

Vào từ tab Markets ([05](05-danh-sach-market.md)) hoặc History ([08](08-lich-su.md)) với `TradeSelection = { event, marketId, outcomeIndex }` (`outcomeIndex`: 0 = Yes, 1 = No).

- `usePolyMarketEvent(slug)`: làm mới event mỗi 30s (dùng `selection.event` làm `initialData`).
- `usePolyMarketOrderBook(tokenId)`: sổ lệnh CLOB `GET /book?token_id=`, refetch mỗi 10s. `tokenId = market.clobTokenIds[outcomeIndex]`.
- `TradeTab` có `key = eventId-marketId-outcomeIndex`, nên khi đổi selection từ bên ngoài, state form (số tiền, slippage…) được reset.

### 2. Giá hiển thị trên nút Yes / No

`outcomeQuotes(market, side)` (giống polymarket.com):

| | Yes | No |
| --- | --- | --- |
| BUY | `bestAsk` | `1 − bestBid` |
| SELL | `bestBid` | `1 − bestAsk` |

Sổ lệnh rỗng thì dùng giá mid (`outcomePrices[0]`).

Event nhiều market: mỗi market là 1 dòng với nút "Buy Yes" / "Buy No". Bấm nút thì chọn market đó và chuyển về side BUY.

### 3. Nhập số tiền

| Side | Ô nhập là | Preset | Input gửi vào quote |
| --- | --- | --- | --- |
| **BUY** | Số USD muốn chi | `+$1`, `+$5`, `+$10`, `+$100`, `Clear` | `{ side: BUY, usd }` |
| **SELL** | Số USD muốn nhận | `25%`, `50%`, `Max` (theo số share đang giữ) | `{ side: SELL, usd, heldShares }` |
| **SELL + Max** | | | `{ side: SELL, shares: floor2(heldShares), heldShares }` (bán hết, tính theo share) |

- `heldShares`: lấy từ `usePolyMarketPositions()` theo `tokenId`.
- Preset SELL `25%` / `50%`: quote số USD nhận được khi bán `heldShares × %` rồi điền vào ô.
- BUY hiện `Min. $1.00` dưới label. Nếu `floor2(usd) < MIN_MARKET_ORDER_USD` thì hiện cảnh báo và disable nút Buy (cùng điều kiện với check lúc submit).

### 4. Quote trên sổ lệnh

`quoteMarketOrder(book, input)` (`services/polymarket/market`) duyệt sổ lệnh:

| Hàm | Dùng khi | Duyệt |
| --- | --- | --- |
| `quoteBuyUsd(asks, usd)` | BUY | asks giá thấp → cao, chi đủ `usd` |
| `quoteSellUsd(bids, usd)` | SELL theo USD | bids giá cao → thấp, nhận đủ `usd` |
| `quoteSellShares(bids, shares)` | SELL hết | bids giá cao → thấp, bán đủ `shares` |

Kết quả `MarketQuote`: `shares`, `usd`, `avgPrice`, `worstPrice` (mức giá tệ nhất chạm tới), `filled` (sổ lệnh có đủ cho toàn bộ số tiền không).

**QuoteSummary** hiển thị:
- BUY: Avg. price, Shares, Potential return `(shares − usd) / usd`, Max price (x% slippage), Min. shares `= usd / maxPrice`, **To win** = số shares (mỗi share thắng được $1).
- SELL: Avg. price, Shares to sell, Min price (x% slippage), Min. received `= shares × minPrice`, **You'll receive** = usd.
- `filled = false`: hiện "Order book depth is not enough for the full amount."

### 5. Slippage

- 3 nút `2%` / `5%` / `10%` (`SLIPPAGE_OPTIONS`), mặc định 5% (`MARKET_ORDER_SLIPPAGE`).
- `slippagePrice(worstPrice, tickSize, side, slippage)`:
  - BUY: `maxPrice = worstPrice × (1 + slippage)`, **làm tròn lên** theo tick, tối đa `1 − tick`.
  - SELL: `minPrice = worstPrice × (1 − slippage)`, **làm tròn xuống** theo tick, tối thiểu `tick`.
  - VD tick 0.01, slippage 5%: BUY quote 0.55 → `maxPrice` 0.58; SELL quote 0.52 → `minPrice` 0.49.
- Giá hiển thị và giá gửi lên dùng chung hàm này nên luôn khớp nhau.

### 6. Bấm Buy / Sell

1. `refetchBook()`: lấy sổ lệnh **mới nhất**.
2. `prepareMarketOrder(tokenId, book, input, slippage)` quote lại và validate:

| Lỗi | Khi nào |
| --- | --- |
| `Enter an amount` | Chưa có sổ lệnh hoặc số tiền ≤ 0 |
| `No liquidity in the order book` | Quote ra 0 share |
| `Not enough liquidity in the order book for this amount` | BUY, `filled = false` |
| `Minimum order is $1` | BUY, `floor2(usd) < 1` |
| `You only hold X shares` | SELL nhiều hơn số đang giữ |
| `Not enough liquidity — only X shares can be sold right now` | SELL, `filled = false` |
| `Amount too small` | SELL, số share sau làm tròn ≤ 0 |

   Hợp lệ thì tạo order:
   - BUY: `{ tokenId, side: BUY, amount: floor2(usd), maxPrice }`
   - SELL: `{ tokenId, side: SELL, shares, minPrice }`. `shares = floor2(min(target, heldShares))`, trong đó `target` = `ceil2(quote.shares)` (SELL theo USD) hoặc `input.shares` (bán hết).
3. `usePlaceMarketOrder` → `getClient()` (switch Polygon nếu cần) → `placeMarketOrder(client, order)`:
   - Gọi `client.placeMarketOrder` của SDK, **mặc định FAK** (Fill-And-Kill): khớp ngay phần sổ lệnh đáp ứng được, phần còn lại huỷ, không treo lệnh. Chỉ dùng FOK khi truyền `orderType: 'FOK'`.
   - `response.ok = false` thì throw `response.message`.
4. Thành công:
   - Xoá ô số tiền, hiện `Order filled (<orderId>) — status <status>`.
   - `refreshAccount`: invalidate `POSITIONS`, `CLOSED_POSITIONS`, `PORTFOLIO_VALUE`, `CASH_BALANCE`, `ACTIVITY`, `OPEN_ORDERS`, `ORDER_BOOK` ngay lập tức, và **thêm 1 lần sau 5s** (`DATA_API_LAG_MS`), vì Data API index lệnh khớp chậm vài giây.

## Vì sao dùng FAK + slippage

Trước đây lệnh BUY hay báo `order couldn't be fully filled. FOK orders are fully filled or killed.` vì:
1. App ép FOK (SDK mặc định là FAK).
2. Giá limit = đúng giá vừa quote (slippage 0%). Sổ lệnh nhích 1 tick giữa lúc quote và lúc khớp là lệnh bị huỷ.

## File liên quan

- `component/polymarket/TradeTab.tsx`: UI, `toOrderInput`, `QuoteSummary`, `OrderBookPanel`, `MarketRow`
- `hooks/polymarket/trading.ts`: `usePlaceMarketOrder`, `refreshAccount`
- `hooks/polymarket/markets.ts`: `usePolyMarketEvent`, `usePolyMarketOrderBook`
- `services/polymarket/market/index.ts`: `quoteBuyUsd`, `quoteSellUsd`, `quoteSellShares`, `quoteMarketOrder`, `slippagePrice`, `prepareMarketOrder`, `outcomeQuotes`, `floor2`, `ceil2`
- `services/polymarket/trading/index.ts`: `placeMarketOrder`
- `services/polymarket/clob/index.ts`: `getOrderBook`

## Constants

- `MIN_MARKET_ORDER_USD` (1), `MARKET_ORDER_SLIPPAGE` (0.05), `ORDER_SIDE` (`services/polymarket/constants.ts`)
- `SLIPPAGE_OPTIONS` (`constants/polymarket.ts`)
- Query key: `EVENT`, `ORDER_BOOK`, `POSITIONS`…

## Lưu ý

- Với FAK, lệnh có thể **khớp một phần** nếu sổ lệnh thay đổi mạnh. Số khớp thực tế xem ở `makingAmount` / `takingAmount` của response.
- Giá trung bình thực tế vẫn theo sổ lệnh. Slippage chỉ là mức giá tệ nhất chấp nhận.
- Giá thấp thì slippage thực tế có thể lớn hơn mức chọn do làm tròn tick (VD giá 5¢, tick 1¢, chọn 2% → max 6¢). UI luôn hiển thị giá limit thực tế.
- Chỉ BUY có mức tối thiểu USD. SELL không có mức tối thiểu USD trong SDK.
- Slippage reset về 5% khi đổi sang market khác (TradeTab mount lại).
- Lệnh SELL nhanh trong Positions dùng cùng logic nhưng slippage cố định 5% (xem [07-positions-claim.md](07-positions-claim.md)).
- `BUY_PRESETS` / `SELL_PRESETS` đang khai báo trong file component, chưa đưa vào constants.
