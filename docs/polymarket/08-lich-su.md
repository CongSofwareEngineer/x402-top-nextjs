# Lịch sử (History tab)

- Cập nhật: 2026-10-05
- Phạm vi: History tab: Activity, Open Orders

## Mục đích

- **Activity**: xem lại các giao dịch (mua, bán, redeem…), biết market còn diễn ra hay đã kết thúc, bấm vào để trade tiếp market đó.
- **Open Orders**: xem và huỷ lệnh đang treo trên CLOB.

## Luồng xử lý

### 1. Activity

1. `usePolyMarketActivity()` → `getActivity(wallet, 50)` → Data `GET /v2/activity?user=<wallet>&limit=50`. Refetch mỗi 60s.
2. Mỗi dòng hiển thị: icon, tên market, outcome (Yes xanh / No đỏ), badge trạng thái, loại (`trade`, `redeem`…) + side (BUY/SELL), số tiền, ngày giờ, link tx hash trên Polygonscan.
3. Ngày: `timestamp` của `/v2/activity` là epoch **giây**, nên phải `× 1000` trước khi format (trước đây quên nhân nên hiện năm 1970).

### 2. Badge Live / Ended

Data API không trả trạng thái market, nên phải lấy thêm từ Gamma:

1. `HistoryTab` gom `slug` (market slug) của các dòng → `usePolyMarketMarketStatuses(slugs)` (bỏ trùng + sort để query key ổn định).
2. `getMarketsBySlugs(slugs)` → Gamma `GET /markets?slug=a&slug=b…`, gọi **song song** `closed=false` và `closed=true` rồi gộp lại (Gamma mặc định chỉ trả market đang mở).
3. `isMarketEnded(market) = closed || acceptingOrders === false`.
4. Kết quả `{ [slug]: ended }`, refetch mỗi 60s.
5. UI: `Live` (xanh, chấm nhấp nháy) / `Ended` (xám). Dưới tên market có link `View on Polymarket ↗` → `POLYMARKET_WEB_URL/event/<eventSlug>/<marketSlug>`.

**Không dùng `endDate`** để xác định đã kết thúc: market thể thao có `endDate` = giờ bắt đầu trận nhưng vẫn trade live trong trận.

### 3. Bấm dòng để trade lại

1. Dòng **bấm được** khi có `eventSlug` và (`tokenId` hoặc `slug`). Hỗ trợ click, phím Enter và nút `Trade ›`.
2. Link tx hash và link Polymarket dùng `stopPropagation`, không mở Trade.
3. `onTrade(item)` → `page.tsx` lưu `historyTrade` và chuyển sang tab Trade.
4. Ở tab Trade: `usePolyMarketEvent(historyTrade.eventSlug)` lấy event. Query chỉ chạy khi đang ở tab Trade để tránh poll thừa.
5. `toTradeSelection(event, item)`:
   - Tìm market có `clobTokenIds` chứa `tokenId` (ra luôn `outcomeIndex`).
   - Không có thì tìm theo market `slug` + `outcomeIndex` của activity.
6. Kết quả:
   - Tìm thấy: render `TradeTab`, mặc định Buy (user tự chuyển sang Sell).
   - Đang tải: hiện "Loading market...".
   - Không tìm thấy (market đã đóng/resolve nên bị SDK lọc): hiện "This market is no longer open for trading."
7. Chọn market từ tab Markets sẽ xoá `historyTrade`.

### 4. Open Orders

1. Chỉ hiện khi đã Enable trading (có CLOB credentials). Nếu chưa thì hiện "Enable trading in the Profile tab…".
2. `usePolyMarketOpenOrders()` → `listOpenOrders(await getClient({ readOnly: true }))`:
   - `readOnly: true` nên **không switch chain** (không ký gì).
   - Duyệt hết các trang `client.listOpenOrders()`, map sang `OpenOrder` (`price`, `originalSize`, `sizeMatched`, `createdAt`…).
   - Refetch mỗi 30s.
3. **Huỷ lệnh**: `window.confirm` → `useCancelOrder` → `cancelOrder(client, orderId)` → invalidate `OPEN_ORDERS`.

## File liên quan

- `component/polymarket/HistoryTab.tsx`: UI Activity, Open Orders, `MarketStatusBadge`, `isTradable`, `polymarketUrl`
- `app/polymarket/page.tsx`: `historyTrade`, `handleTradeFromHistory`, `toTradeSelection`
- `hooks/polymarket/account.ts`: `usePolyMarketActivity`
- `hooks/polymarket/markets.ts`: `usePolyMarketMarketStatuses`, `usePolyMarketEvent`
- `hooks/polymarket/trading.ts`: `usePolyMarketOpenOrders`, `useCancelOrder`
- `services/polymarket/data/index.ts`: `getActivity`
- `services/polymarket/gamma/index.ts`: `getMarketsBySlugs`, `getEventBySlug`
- `services/polymarket/market/index.ts`: `isMarketEnded`
- `services/polymarket/trading/index.ts`: `listOpenOrders`, `cancelOrder`

## Constants

- `POLYMARKET_WEB_URL`, `EXPLORERS.POLYGON` (`constants/polymarket.ts`)
- Query key: `ACTIVITY`, `MARKET_STATUSES`, `EVENT`, `OPEN_ORDERS`

## Lưu ý

- Chỉ lấy **50 activity gần nhất**, chưa có phân trang (API có `nextCursor` nhưng UI chưa dùng).
- "Chờ kết quả" (hết giờ nhưng chưa resolve) được tính là Ended khi Polymarket ngừng nhận lệnh (`acceptingOrders = false`). Nếu vẫn nhận lệnh thì là Live.
- Dòng không có `slug` hoặc chưa tải xong trạng thái thì không hiện badge.
- Nút Trade vẫn hiện với market đã Ended (theo yêu cầu). Khi mở sẽ báo không còn trade được.
- App chỉ đặt lệnh market FAK (không treo), nên Open Orders thường rỗng. Danh sách chủ yếu là lệnh limit đặt từ nơi khác (VD polymarket.com) với cùng ví.
