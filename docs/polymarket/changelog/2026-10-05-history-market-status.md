# History: trạng thái market (Live / Ended) + link sang Polymarket

- Ngày: 2026-10-05
- Phạm vi: polymarket / History tab (Activity)

## Mục đích
User xem lại lịch sử giao dịch nhưng không biết market nào còn đang diễn ra, market nào đã kết thúc. Thêm badge trạng thái cho từng dòng và một link nhỏ mở market trên polymarket.com để xem chi tiết.

## Luồng xử lý
1. `usePolyMarketActivity` trả về danh sách activity (Data API v2 không có trạng thái market).
2. `HistoryTab` gom các `slug` (market slug) → `usePolyMarketMarketStatuses(slugs)`.
3. Hook gọi SDK `getMarketsBySlugs`: Gamma `/markets?slug=...&slug=...`, chạy song song `closed=false` và `closed=true` (Gamma mặc định chỉ trả market đang mở) rồi gộp lại.
4. Mỗi market được map qua `isMarketEnded`: `closed || acceptingOrders === false` → Ended, ngược lại → Live. Refetch mỗi 60s.
5. UI: badge `Live` (xanh, chấm nhấp nháy) / `Ended` (xám) cạnh outcome; dòng `View on Polymarket ↗` dưới tên market trỏ tới `polymarket.com/event/<eventSlug>/<marketSlug>` (click không mở Trade tab).

## File liên quan
- `services/polymarket/gamma/index.ts` — `getMarketsBySlugs`
- `services/polymarket/market/index.ts` — `isMarketEnded`
- `services/polymarket/index.ts` — export 2 hàm trên
- `hooks/polymarket/markets.ts` — `usePolyMarketMarketStatuses`
- `component/polymarket/HistoryTab.tsx` — badge trạng thái + link Polymarket

## Constants / Translation keys mới
- `REACT_QUERY_POLY_MARKET.MARKET_STATUSES`
- `POLYMARKET_WEB_URL` (`constants/polymarket.ts`)

## Lưu ý
- Không dùng `endDate` để xác định đã kết thúc: market thể thao có `endDate` = giờ bắt đầu trận nhưng vẫn trade live trong trận.
- "Chờ kết quả" (hết giờ nhưng chưa resolve) được tính là Ended khi Polymarket ngừng nhận lệnh (`acceptingOrders = false`); nếu vẫn nhận lệnh thì là Live.
- Dòng không có `slug` hoặc chưa tải xong trạng thái thì không hiện badge.
- Nút Trade vẫn giữ nguyên cho cả market đã kết thúc (theo yêu cầu).
- `PositionsPanel` vẫn hardcode `https://polymarket.com` — có thể chuyển sang `POLYMARKET_WEB_URL` sau.
