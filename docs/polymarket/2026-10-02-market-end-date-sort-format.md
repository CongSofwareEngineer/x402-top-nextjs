# Sort theo ngày hết hạn + format ngày DD/MM/YYYY

- Ngày: 2026-10-02
- Phạm vi: polymarket / Markets, Trade, History, Profile

## Mục đích
- Cho user sắp xếp market theo ngày hết hạn (`endDate`) bằng một select riêng, dễ chọn hơn chip.
- Thống nhất format ngày `DD/MM/YYYY` (có giờ thì `DD/MM/YYYY HH:mm`) ở mọi nơi trong module Polymarket.
- Hiển thị `endDate` kèm giờ (`DD/MM/YYYY HH:mm`) ở cả trang list (card) và trang chi tiết (header + từng market con) để tester dễ kiểm tra.

## Luồng xử lý
1. Chip "Ending Soon" được chuyển vào select "End date" (Any / Ending soonest / Ending latest).
2. Khi chọn option trong select → gọi Gamma `/events/keyset` với `order=endDate`, `ascending` theo option, và `end_date_min=<now>`. Select ghi đè chip sort đang chọn (chip mất trạng thái active).
3. Bấm một chip sort → reset select về "Any".
4. `end_date_min` loại các event đã quá `endDate` nhưng chưa đóng (đang chờ resolve) — trước đây "Ending Soon" bị đẩy các event từ 2025 lên đầu.
5. Gửi thêm `exclude_tag_id=102127` (tag `up-or-down`). Fix bug sort tăng dần ra list rỗng: các event sắp hết hạn gần như toàn là "Bitcoin/ETH… Up or Down" 5 phút, outcome là `Up`/`Down` (không phải Yes/No) nên SDK lọc bỏ hết 50 event của trang đầu → UI rỗng.
6. Ngày hiển thị qua `formatDate` / `formatDateTime` trong `component/polymarket/format.ts`, luôn theo múi giờ `DISPLAY_TIME_ZONE` (`Asia/Ho_Chi_Minh`, GMT+7) bất kể máy người xem để múi giờ nào. Có giờ thì kèm nhãn múi giờ: `02/10/2026 14:00 GMT+7`.
7. Data API trả ngày theo UTC (`...Z`), VD `2026-10-02T07:00:00Z` → hiển thị `02/10/2026 14:00 GMT+7`.
8. Fix bug History: `/v2/activity` trả `timestamp` theo **giây**, trước đây đưa thẳng vào `new Date()` (hiểu là mili-giây) nên ra năm 1970 → giờ nhân `* 1000`.

## File liên quan
- `constants/polymarket.ts` — bỏ `endingSoon` khỏi `MARKET_SORT_PRESETS`, thêm `EXPIRY_SORT_ORDER`, `EXPIRY_SORT_OPTIONS`, `EXPIRY_SORT_EXCLUDED_TAG_IDS`, type `ExpirySortKey`.
- `services/polymarket/types/index.ts` — `MarketFilters.endDateMin`, `MarketFilters.excludeTagIds`.
- `services/polymarket/gamma/index.ts` — gửi `end_date_min`, `exclude_tag_id` lên Gamma.
- `component/polymarket/format.ts` — `formatDate`, `formatDateTime`.
- `component/polymarket/MarketsTab.tsx` — select sort theo ngày hết hạn, card hiển thị "Ends DD/MM/YYYY HH:mm GMT+7".
- `component/polymarket/TradeTab.tsx` — header hiển thị `endDate` (kèm giờ) của market đang chọn (fallback event), mỗi market con hiển thị `endDate` (kèm giờ).
- `component/polymarket/HistoryTab.tsx` — cột Date dùng `DD/MM/YYYY HH:mm GMT+7`, activity `timestamp` (giây) × 1000.
- `services/polymarket/types/index.ts` — ghi chú `ActivityItem.timestamp` là epoch giây.
- `component/polymarket/ProfileTab.tsx` — ngày tham gia dùng `DD/MM/YYYY`.

## Constants / Translation keys mới
- `EXPIRY_SORT_ORDER`, `EXPIRY_SORT_OPTIONS`, `EXPIRY_SORT_EXCLUDED_TAG_IDS`, `ExpirySortKey`, `DISPLAY_TIME_ZONE`
- Module Polymarket chưa có hạ tầng i18n (`useLanguage`, `vn.json`/`en.json`) nên label vẫn để tiếng Anh như phần còn lại của module.

## Lưu ý
- `end_date_min` lấy thời điểm lúc chọn sort (memo theo sort/category), không tự cập nhật theo thời gian thực.
- Event không có `endDate` sẽ không hiện dòng "Ends".
- Sau khi exclude `up-or-down`, trang đầu (50 event) vẫn có thể bị lọc bớt vài event không phải Yes/No (VD: category Sports còn ~35/50), nhưng không còn rỗng.
