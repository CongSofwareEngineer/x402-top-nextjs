# Format hiển thị

- Cập nhật: 2026-10-05
- Phạm vi: toàn bộ UI Polymarket

## Mục đích

Thống nhất cách hiển thị ngày giờ, tiền, volume, giá và xác suất. Mọi hàm nằm trong `component/polymarket/format.ts` (chỉ format, không chứa logic market).

## Ngày giờ

| Hàm | Output | Dùng ở |
| --- | --- | --- |
| `formatDate(value)` | `DD/MM/YYYY` | Ngày tham gia (Profile) |
| `formatDateTime(value)` | `DD/MM/YYYY HH:mm` | `Ends …` (Markets, Trade), cột Date (History) |

- Luôn hiển thị theo múi giờ `DISPLAY_TIME_ZONE` = `Asia/Ho_Chi_Minh` (GMT+7), **bất kể** máy người xem để múi giờ nào, để tester ở đâu cũng thấy cùng 1 giờ.
- Giờ đã được đổi sẵn sang GMT+7, **không** hiện nhãn múi giờ (user thường không hiểu nhãn `GMT+7`).
- API trả ngày UTC. VD `2026-10-02T07:00:00Z` → `02/10/2026 14:00`.
- Input sai thì trả chuỗi rỗng.
- Input nhận ISO string, epoch **mili-giây** hoặc `Date`.

**Timestamp dạng giây** (phải `× 1000` trước khi format):
- `ActivityItem.timestamp` (Data `/v2/activity`)
- `UserStats.joinDate` (Data `/v2/user-stats`)

## Tiền và volume

| Hàm | VD | Dùng ở |
| --- | --- | --- |
| `formatVolume(num)` | `$2.1m`, `$540k`, `$12` | Card ở tab Markets (gọn cho list) |
| `formatVolumeFull(num)` | `2931.378` → `$2,931` | Tab Trade (header event + từng market) |
| `formatUsd(num)` | `$12.50` | Quote, positions, claim… |
| `formatSignedUsd(num)` | `+$12.50`, `-$3.00` | P&L |

- `formatVolumeFull`: làm tròn về số nguyên (`.5` trở lên làm tròn lên), có dấu phẩy hàng nghìn (`en-US`). Tester cần thấy volume đầy đủ thay vì dạng rút gọn.

## Giá và xác suất

| Hàm | VD | Ghi chú |
| --- | --- | --- |
| `formatCents(price)` | `0.594` → `59.4¢`, `0.59` → `59¢` | Giá outcome (0..1) |
| `formatChance(price)` | `59%`, `<1%`, `>99%` | % Yes |

## File liên quan

- `component/polymarket/format.ts`: các hàm format
- `constants/polymarket.ts`: `DISPLAY_TIME_ZONE`

## Lưu ý

- `ProfileTab.tsx` có `formatNumber` / `formatCurrency` riêng (VD `1.2K` trades), chưa gom vào `format.ts`.
- `formatUsd` dùng locale của trình duyệt (`toLocaleString(undefined…)`), nên dấu ngăn cách có thể khác giữa các máy. `formatVolumeFull` cố định `en-US`.
