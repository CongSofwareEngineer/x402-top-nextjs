# Hiển thị số tiền mua tối thiểu

- Ngày: 2026-10-02
- Phạm vi: polymarket / trading (TradeTab, lệnh BUY)

## Mục đích
Bug: user không biết số tiền mua tối thiểu. Nhập dưới $1 vẫn bấm Buy được, tới lúc submit mới báo lỗi `Minimum order is $1`.

## Luồng xử lý
1. Khi ở tab Buy, dưới label "Amount" hiện `Min. $1.00` (`MIN_MARKET_ORDER_USD`).
2. Nhập số tiền > 0 nhưng sau khi cắt xuống 2 chữ số thập phân vẫn < `MIN_MARKET_ORDER_USD` → hiện cảnh báo `Minimum buy amount is $1.00.` và disable nút Buy.
3. Điều kiện giống hệt check trong `prepareMarketOrder` (`floor2(usd) < MIN_MARKET_ORDER_USD`), check lúc submit vẫn giữ nguyên.

## File liên quan
- `component/polymarket/TradeTab.tsx` — `belowMinBuy`, hint min và cảnh báo.
- `services/polymarket/constants.ts` — `MIN_MARKET_ORDER_USD` (đã có, không đổi).

## Constants / Translation keys mới
- Không có. Module Polymarket chưa có hạ tầng i18n nên label vẫn để tiếng Anh.

## Lưu ý
- Chỉ áp dụng cho BUY; SELL không có mức USD tối thiểu trong SDK.
