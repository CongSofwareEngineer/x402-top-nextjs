# Chọn mức slippage khi mua/bán (2% / 5% / 10%)

- Ngày: 2026-10-02
- Phạm vi: polymarket / trading (TradeTab)

## Mục đích
Trước đây slippage cố định 5% (`MARKET_ORDER_SLIPPAGE`) và user không thấy được. Giờ user chọn mức slippage bằng button và thấy ngay giá tệ nhất mình chấp nhận + số lượng tối thiểu nhận được.

## Luồng xử lý
1. TradeTab có dòng "Slippage" với 3 button `2%` / `5%` / `10%` (không có thanh kéo). Mặc định 5% (`MARKET_ORDER_SLIPPAGE`).
2. Khi đã nhập số tiền, QuoteSummary hiện thêm:
   - BUY: `Max price (x% slippage)` = giá xấu nhất đã quote + x%, và `Min. shares` = số tiền / max price.
   - SELL: `Min price (x% slippage)` = giá xấu nhất đã quote − x%, và `Min. received` = số shares × min price.
3. Khi bấm Buy/Sell: `prepareMarketOrder(tokenId, book, input, slippage)` dùng đúng mức đã chọn để tính `maxPrice` / `minPrice` gửi lên CLOB (lệnh FAK như cũ).
4. Giá hiển thị và giá gửi lên dùng chung hàm `slippagePrice` nên luôn khớp nhau (giá hiển thị tính trên sổ lệnh hiện tại; lúc submit sẽ re-quote trên sổ lệnh mới nhất).

## File liên quan
- `services/polymarket/market/index.ts` — `slippagePrice` nhận thêm tham số `slippage` và được export; `prepareMarketOrder` nhận thêm `slippage` (mặc định `MARKET_ORDER_SLIPPAGE`).
- `services/polymarket/index.ts` — export `slippagePrice`.
- `constants/polymarket.ts` — `SLIPPAGE_OPTIONS`.
- `component/polymarket/TradeTab.tsx` — state `slippage`, button chọn mức, hiển thị max/min price; `PresetButton` có thêm trạng thái `active`.

## Constants / Translation keys mới
- `SLIPPAGE_OPTIONS = [0.02, 0.05, 0.1]`
- Module Polymarket chưa có hạ tầng i18n nên label vẫn để tiếng Anh như phần còn lại.

## Lưu ý
- Giá limit được làm tròn theo `tickSize` (BUY làm tròn lên, SELL làm tròn xuống) và giới hạn trong `[tick, 1 − tick]`. Với giá thấp, slippage thực tế có thể lớn hơn mức chọn (VD giá 5¢, tick 1¢, chọn 2% → max 6¢), nên UI luôn hiển thị giá limit thực tế.
- Nút "Sell" trong `PositionsPanel` vẫn dùng mặc định 5%.
- Mức slippage reset về 5% khi đổi sang market khác (TradeTab được mount lại).
