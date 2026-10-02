# Lệnh market: mặc định FAK + slippage 5%

- Ngày: 2026-10-02
- Phạm vi: polymarket / trading (lệnh BUY/SELL theo giá market)

## Mục đích
Lệnh BUY market báo lỗi `order couldn't be fully filled. FOK orders are fully filled or killed.` vì:
1. `placeMarketOrder` ép **FOK** khi không truyền `orderType` (SDK mặc định là FAK). TradeTab không truyền → mọi lệnh BUY là FOK.
2. Giá limit (`maxPrice` / `minPrice`) = đúng giá xấu nhất vừa quote → slippage 0%. Sổ lệnh nhích 1 tick giữa lúc quote và lúc khớp là FOK bị hủy toàn bộ.

## Luồng xử lý
1. `prepareMarketOrder` quote trên sổ lệnh mới nhất như cũ.
2. Giá limit = giá xấu nhất ± `MARKET_ORDER_SLIPPAGE` (5%), làm tròn theo `tickSize` (BUY làm tròn lên, SELL làm tròn xuống), giới hạn trong `[tick, 1 - tick]`.
   - VD: BUY quote 0.55 → `maxPrice` 0.58; SELL quote 0.52 → `minPrice` 0.49.
3. `placeMarketOrder` mặc định **FAK**: khớp ngay phần sổ lệnh đáp ứng được, phần còn lại hủy, không treo lệnh limit. Chỉ dùng FOK khi truyền `orderType: 'FOK'`.

## File liên quan
- `services/polymarket/constants.ts` — `MARKET_ORDER_SLIPPAGE`
- `services/polymarket/market/index.ts` — `slippagePrice`, `prepareMarketOrder` (nhận thêm `tickSize` từ book)
- `services/polymarket/trading/index.ts` — `placeMarketOrder` mặc định FAK

## Constants / Translation keys mới
- `MARKET_ORDER_SLIPPAGE`

## Lưu ý
- Lệnh vẫn chặn trước khi gửi nếu sổ lệnh không đủ thanh khoản cho toàn bộ số tiền (`quote.filled`).
- Với FAK, lệnh có thể khớp một phần nếu sổ lệnh thay đổi mạnh; số khớp thực tế xem ở `makingAmount` / `takingAmount` của response.
- Giá trung bình thực tế vẫn theo sổ lệnh; slippage chỉ là mức giá tệ nhất chấp nhận.
