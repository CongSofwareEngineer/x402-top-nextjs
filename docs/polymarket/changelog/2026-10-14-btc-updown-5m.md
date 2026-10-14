# Markets: ghim event "BTC Up or Down 5 phút" + hỗ trợ market Up/Down + giá realtime

- Ngày: 2026-10-14
- Phạm vi: polymarket / Markets tab, Trade tab, SDK gamma

## Mục đích
Trang chủ polymarket.com luôn có card "Bitcoin Up or Down" theo khung 5 phút. Feed `/events/keyset` của app không có event này ở đầu, và SDK cũng lọc mất nó vì outcome là `Up`/`Down` chứ không phải `Yes`/`No`. Thay đổi này gọi thêm event của khung 5 phút hiện tại, ghim lên đầu gallery kèm đồng hồ đếm ngược, và cho phép trade market Up/Down.

## Luồng xử lý
1. Slug event có dạng `btc-updown-5m-<windowStart>`. `windowStart` là unix giây, chia hết cho 300 (VD `btc-updown-5m-1791965400` = khung 4:10–4:15 AM ET).
2. SDK `upDownWindowStart(intervalSec)` tính `windowStart` của khung hiện tại. `getUpDownEvent(slugPrefix, windowStart)` gọi Gamma `GET /events?slug=...` qua `getEventBySlug`.
3. Hook `usePolyMarketUpDownEvent(UP_DOWN_SERIES.BTC_5M)`:
   - Giữ `windowStart` trong state và đặt `setTimeout` tới mốc khung kế tiếp để tự chuyển sang event mới.
   - Query key `[UP_DOWN_EVENT, slugPrefix, windowStart]`, refetch Gamma mỗi `UP_DOWN_REFETCH_MS` (30s, chỉ để cập nhật volume/trạng thái). Giá lấy qua WebSocket, xem mục "Giá realtime".
4. `MarketsTab` gộp `galleryEvents = [pinnedEvent, ...feed bỏ trùng id]`. Card ghim chỉ hiện khi:
   - Category là "All" hoặc Crypto (`UP_DOWN_SERIES.BTC_5M.tagId`).
   - Không dán link polymarket.
   - Search rỗng hoặc khớp với tiêu đề.
5. Card ghim dùng lại `EventCard` với prop `countdown`: footer hiện `Live · m:ss` (tick 1s, `formatCountdown`) thay cho "Ends ...".
6. SDK `isYesNoMarket` → `isBinaryMarket`: giữ market có outcome thuộc `BINARY_OUTCOME_PAIRS` (`yes/no`, `up/down`). Index 0 = Yes/Up, 1 = No/Down, nên luồng đặt lệnh không đổi.
7. Nút outcome ở MarketsTab và TradeTab lấy tên từ `market.outcomes` qua `outcomeName(market, index)`, không còn hardcode `Yes`/`No`.

## Giá realtime (WebSocket CLOB)
Vấn đề: `outcomePrices` của Gamma bị cache và lệch so với sổ lệnh thật (đo được: Gamma 70.5% trong khi bid/ask là 0.52/0.53), nên % trên card gần như không đổi dù refetch 5s/lần.

1. SDK `subscribeMarketQuotes(tokenIds, onQuote)` (`services/polymarket/clob/ws.ts`) mở `wss://ws-subscriptions-clob.polymarket.com/ws/market` và gửi `{ assets_ids, type: 'market' }`.
   - Tin `book`: thay toàn bộ sổ lệnh của token.
   - Tin `price_change`: cập nhật từng mức giá (`size` là tổng mới; `size = 0` thì xoá mức đó). `BUY` = bids, `SELL` = asks.
   - Gửi `PING` mỗi `CLOB_WS_PING_MS` (10s). Bị rớt thì tự kết nối lại sau `CLOB_WS_RECONNECT_MS` (2s); server gửi lại snapshot `book`.
   - Gộp cập nhật: market BTC 5m có ~700 tin/giây, nên chỉ phát tối đa mỗi `CLOB_WS_FLUSH_MS` (200ms ≈ 5 lần/giây). Đo thực tế: 21.160 tin → 135 lần phát trong 30s.
2. Hook `useLiveQuote(tokenId)` (nội bộ) giữ quote mới nhất, chỉ trả về khi `assetId` khớp token hiện tại (đổi token thì không hiện sổ lệnh cũ).
3. `usePolyMarketLiveMarket(market)` ghép `bestBid`/`bestAsk` live của token đầu (Yes/Up) vào market. Chance = giá giữa `(bid + ask) / 2` → `outcomePrices = [mid, 1 - mid]`.
4. `usePolyMarketOrderBook(tokenId)`: REST `/book` vẫn cấp snapshot + tickSize/minOrderSize, còn bids/asks được thay bằng bản live. `refetch()` vẫn trả về sổ lệnh REST để báo giá lại ngay trước khi đặt lệnh.
5. Áp dụng:
   - Card ghim ở MarketsTab (`EventCard` với prop `live`): % chance nhảy realtime.
   - TradeTab: market đang chọn (nút giá Up/Down, %), Order Book.
   - Form Sell ở PositionsPanel (dùng chung `usePolyMarketOrderBook`).

## Countdown
- `Countdown` (export từ `MarketsTab.tsx`), cập nhật mỗi giây (`COUNTDOWN_TICK_MS`):
  - `size='sm'`: badge `Live · m:ss` ở chân card ghim.
  - `size='lg'`: khối lớn `MM : SS` (nhãn Mins/Secs) ở header TradeTab.
- Hết giờ thì hiện `Ended` (màu xám).
- TradeTab chỉ hiện countdown lớn khi `event.slug` bắt đầu bằng `slugPrefix` của một series trong `UP_DOWN_SERIES`.

## File liên quan
- `services/polymarket/constants.ts` — `BINARY_OUTCOME_PAIRS`
- `services/polymarket/gamma/index.ts` — `isBinaryMarket`, `upDownWindowStart`, `getUpDownEvent`
- `services/polymarket/market/index.ts` — `outcomeName`
- `services/polymarket/index.ts` — export các hàm mới
- `constants/polymarket.ts` — `UP_DOWN_SERIES`, `UpDownSeries`, `UP_DOWN_REFETCH_MS`
- `constants/reactQuery.ts` — `REACT_QUERY_POLY_MARKET.UP_DOWN_EVENT`
- `hooks/polymarket/markets.ts` — `usePolyMarketUpDownEvent`
- `component/polymarket/format.ts` — `formatCountdown`
- `component/polymarket/MarketsTab.tsx` — card ghim, `Countdown`, nhãn outcome động
- `component/polymarket/TradeTab.tsx` — nhãn outcome động (Up/Down), market đang chọn dùng giá live
- `services/polymarket/clob/ws.ts` — `subscribeMarketQuotes`
- `services/polymarket/clob/type.ts` — `WsBookMessage`, `WsPriceChangeMessage`, `WsMarketMessage`
- `services/polymarket/types/index.ts` — `LiveQuote`
- `hooks/polymarket/markets.ts` — `useLiveQuote`, `usePolyMarketLiveMarket`, `usePolyMarketOrderBook` (ghép live)

## Constants / Translation keys mới
- `UP_DOWN_SERIES`, `UP_DOWN_REFETCH_MS`, `REACT_QUERY_POLY_MARKET.UP_DOWN_EVENT`, `BINARY_OUTCOME_PAIRS`
- `API_POLYMARKET.CLOB_WS`, `CLOB_WS_PING_MS`, `CLOB_WS_RECONNECT_MS`, `CLOB_WS_FLUSH_MS`
- Không có translation key: module polymarket chưa dùng `useLanguage`, text vẫn là tiếng Anh như các phần khác.

## Lưu ý
- Vì đã nới bộ lọc, các event Up/Down khác (ETH 15m, hourly...) giờ cũng có thể xuất hiện trong feed Trending/Crypto, giống polymarket.com.
- Sort theo ngày hết hạn vẫn `exclude_tag_id = 102127` (`up-or-down`) để các khung 5 phút không chiếm hết trang.
- Khi khung kết thúc, market đóng. Nếu user đang ở Trade tab của khung cũ thì sẽ thấy "no open market" và cần quay lại Markets để chọn khung mới.
- Muốn thêm series khác (VD `eth-updown-15m`) chỉ cần thêm entry vào `UP_DOWN_SERIES`. Hiện gallery mới ghim `BTC_5M`.
- Các card khác trong gallery vẫn lấy % từ Gamma `outcomePrices` (cache). Chỉ card ghim là live, để không mở hàng chục WebSocket.
- Mỗi lần gọi `subscribeMarketQuotes` mở một socket riêng. TradeTab hiện mở 2 socket (token Yes/Up cho % và token đang trade cho Order Book). Nếu cần tối ưu thì gom về 1 socket dùng chung.
