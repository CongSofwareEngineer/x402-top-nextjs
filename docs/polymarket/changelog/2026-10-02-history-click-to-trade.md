# History click-to-trade & đưa Positions lên dưới Profile

- Ngày: 2026-10-02
- Phạm vi: polymarket / History, Profile (chỉ UI, không đổi logic SDK/hook)

## Mục đích
- User bấm vào một dòng trong History (Activity) để mở lại market đó ở tab Trade, tiếp tục mua thêm hoặc bán.
- Positions đưa lên ngay dưới card Profile cho dễ thấy.

## Luồng xử lý
1. `HistoryTab` nhận prop `onTrade(item)`. Dòng có `eventSlug` + (`tokenId` hoặc `slug`) mới click được (có hover, phím Enter, nút "Trade ›"). Link Tx hash `stopPropagation` để không mở trade.
2. `page.tsx` lưu `historyTrade` rồi chuyển sang tab Trade.
3. Ở tab Trade, gọi hook có sẵn `usePolyMarketEvent(eventSlug)` lấy event.
4. `toTradeSelection` tìm market theo `tokenId` trong `clobTokenIds` (ra luôn outcomeIndex); không có thì tìm theo market `slug` + `outcomeIndex` của activity.
5. Có selection → render `TradeTab` (mặc định Buy, user tự chuyển sang Sell). Không tìm thấy (market đã đóng / resolve) → báo "This market is no longer open for trading."
6. Chọn market từ tab Markets sẽ xoá `historyTrade`.

## File liên quan
- `app/polymarket/page.tsx` — state `historyTrade`, fetch event, map sang `TradeSelection`
- `component/polymarket/HistoryTab.tsx` — UI bảng Activity mới (icon + title + outcome, gộp Type/Side), dòng click được
- `component/polymarket/ProfileTab.tsx` — `PositionsPanel` chuyển lên ngay dưới card Profile
- `component/polymarket/PositionsPanel.tsx` — sửa text "above" → "below" do onboarding giờ nằm dưới

## Constants / Translation keys mới
- Không có. Dự án chưa có `useLanguage` / file ngôn ngữ, text giữ tiếng Anh như các component polymarket hiện tại.

## Lưu ý
- `getEventBySlug` chỉ giữ market Yes/No đang mở → activity của market đã resolve sẽ hiện thông báo không trade được.
- Query event chỉ chạy khi đang ở tab Trade để tránh poll thừa.
