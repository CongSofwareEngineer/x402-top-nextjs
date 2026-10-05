# Danh sách market

- Cập nhật: 2026-10-05
- Phạm vi: Markets tab

## Mục đích

Hiển thị các event đang mở giống trang chủ polymarket.com. User lọc theo category, sắp xếp, tìm kiếm hoặc dán link polymarket.com, rồi chọn Yes/No để chuyển sang tab Trade.

## Luồng xử lý

### 1. Lấy dữ liệu

`usePolyMarketEvents(filters)` (`useInfiniteQuery`) → `listEvents(filters)` → Gamma `GET /events/keyset`.

| Param Gamma | Lấy từ | Ghi chú |
| --- | --- | --- |
| `closed` | `false` | Chỉ event đang mở |
| `limit` | `MARKETS_PAGE_SIZE` (50) | |
| `order`, `ascending` | Sort đang chọn | Xem mục 3 |
| `tag_id` | Category đang chọn | Không chọn = tất cả |
| `after_cursor` | `nextCursor` của trang trước | Nút "Load more" |
| `end_date_min`, `exclude_tag_id` | Chỉ khi sort theo ngày hết hạn | Xem mục 3 |

- Refetch mỗi 60s (staleTime 30s).
- Các trang được nối lại và **bỏ trùng theo `event.id`**.

### 2. Lọc market (trong SDK)

`mapGammaEvent` (`services/polymarket/gamma`) chỉ giữ market **Yes/No đang mở**:
- `outcomes` đúng là `['Yes', 'No']` và có 2 `clobTokenIds`
- `closed = false` và `acceptingOrders !== false`

Event không còn market nào sau khi lọc thì bị bỏ khỏi list.

Thứ tự market trong event:
- Event **neg-risk** (nhiều lựa chọn loại trừ nhau): theo % Yes giảm dần, giống polymarket.com.
- Event khác (VD "by date…"): theo `groupItemThreshold` tăng dần.

### 3. Sort

**Chip sort** (`MARKET_SORT_PRESETS`):

| Chip | `order` | Chiều |
| --- | --- | --- |
| Trending (mặc định) | `volume24hr` | giảm |
| New | `startDate` | giảm |
| Volume | `volume` | giảm |
| Liquidity | `liquidity` | giảm |
| Competitive | `competitive` | giảm |

**Select "End date"** (`EXPIRY_SORT_OPTIONS`): `Any` / `Ending soonest` / `Ending latest`.
- Chọn 1 option thì **ghi đè** chip sort (chip mất trạng thái active): `order = endDate`, `ascending` theo option.
- Gửi thêm `end_date_min = now`, để loại event đã quá `endDate` nhưng chưa đóng (đang chờ resolve). Nếu không, "Ending soonest" bị đẩy các event từ 2025 lên đầu.
- Gửi thêm `exclude_tag_id = 102127` (tag `up-or-down`). Các event sắp hết hạn gần như toàn là "BTC/ETH Up or Down" 5 phút, outcome là `Up`/`Down` (không phải Yes/No) nên bị SDK lọc hết, khiến list rỗng.
- Bấm 1 chip sort thì reset select về `Any`.

### 4. Category

Chip theo `POLYMARKET_CATEGORIES` (Sports, Politics, Crypto…). `id` là tag id top-level của Gamma, gửi lên dưới dạng `tag_id`.

### 5. Tìm kiếm / dán link

Ô search có 2 chế độ:
- **Text thường**: lọc phía client trên các event **đã tải**, theo `event.title` hoặc `market.question` (không phân biệt hoa thường).
- **Link polymarket.com** (`parsePolymarketUrl` nhận dạng `https://polymarket.com/event/<eventSlug>[/<marketSlug>]`): hiện nút **Open** (hoặc nhấn Enter):
  1. `getEventBySlug(eventSlug)` → Gamma `/events?slug=`.
  2. Tìm market theo `marketSlug`, không có thì lấy market đầu tiên.
  3. Mở tab Trade với outcome Yes.
  4. Lỗi (`Event not found`, `This event has no open Yes/No market`) thì hiện dưới ô search.

### 6. Card event

- **1 market**: gauge % Yes (`yesChance` = `outcomePrices[0]`) + 2 nút Yes / No.
- **Nhiều market**: mỗi dòng 1 market với % và nút Yes / No. Tooltip giá lấy từ `outcomeQuotes(market, 'BUY')`.
- Hiện volume rút gọn (`formatVolume`) và `Ends DD/MM/YYYY HH:mm` nếu có `endDate`.
- Bấm card thì chọn market đầu, outcome Yes. Bấm nút Yes/No thì chọn đúng market + outcome đó.
- Khi chọn: `onSelect({ event, marketId, outcomeIndex })`. `page.tsx` lưu selection, xoá `historyTrade` (nếu có) và chuyển sang tab Trade (xem [06-mua-ban.md](06-mua-ban.md)).

## File liên quan

- `component/polymarket/MarketsTab.tsx`: UI, filter, sort, search, card event
- `hooks/polymarket/markets.ts`: `usePolyMarketEvents`
- `services/polymarket/gamma/index.ts`: `listEvents`, `getEventBySlug`, `mapGammaEvent`, `isYesNoMarket`
- `services/polymarket/market/index.ts`: `parsePolymarketUrl`, `yesChance`, `outcomeQuotes`, `marketLabel`
- `app/polymarket/page.tsx`: `handleSelect`

## Constants

- `POLYMARKET_CATEGORIES`, `MARKET_SORT_PRESETS`, `EXPIRY_SORT_ORDER`, `EXPIRY_SORT_OPTIONS`, `EXPIRY_SORT_EXCLUDED_TAG_IDS`, `MARKETS_PAGE_SIZE` (`constants/polymarket.ts`)
- Query key: `EVENTS`

## Lưu ý

- Search text chỉ lọc event **đã tải về**, không gọi API search. Event chưa tải (trang sau) sẽ không tìm thấy.
- `end_date_min` lấy thời điểm lúc chọn sort (memo theo sort/category), không tự cập nhật theo thời gian thực.
- Sau khi exclude `up-or-down`, trang đầu vẫn có thể bị lọc bớt vài event không phải Yes/No (VD Sports còn ~35/50), nhưng không còn rỗng.
- Event có market không phải Yes/No (VD `Up`/`Down`, tên đội) không hiển thị và không trade được trong app.
