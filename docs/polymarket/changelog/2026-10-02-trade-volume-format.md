# Hiển thị volume đầy đủ ở trang Trade

- Ngày: 2026-10-02
- Phạm vi: polymarket / Trade

## Mục đích
Trang Trade trước đây dùng `formatVolume` (dạng rút gọn `$3k`, `$2.1m`) nên làm tròn mất phần nguyên. Tester cần thấy volume đầy đủ, chỉ bỏ phần thập phân.

## Luồng xử lý
1. Thêm `formatVolumeFull` trong `component/polymarket/format.ts`: làm tròn về số nguyên (`maximumFractionDigits: 0`), có dấu phẩy ngăn cách hàng nghìn (locale `en-US`).
2. VD: `2931.3780319999996` → `$2,931 Vol.`
3. Trang Trade (header event + từng market con) chuyển sang dùng `formatVolumeFull`.

## File liên quan
- `component/polymarket/format.ts` — thêm `formatVolumeFull`.
- `component/polymarket/TradeTab.tsx` — dùng `formatVolumeFull` thay cho `formatVolume`.

## Constants / Translation keys mới
- Không có.

## Lưu ý
- Card ở trang Markets (`MarketsTab.tsx`) vẫn dùng `formatVolume` dạng rút gọn cho gọn giao diện list.
- Làm tròn theo quy tắc chuẩn (`.5` trở lên làm tròn lên), VD `2931.6` → `$2,932`.
