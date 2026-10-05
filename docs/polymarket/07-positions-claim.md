# Positions: bán nhanh và Claim

- Cập nhật: 2026-10-05
- Phạm vi: Profile tab → panel "Positions" (ngay dưới card profile)

## Mục đích

Hiển thị các vị thế của user và cho phép:
- **Bán** vị thế đang mở ngay tại Profile (cash out), không cần sang tab Trade.
- **Claim**: đổi share thắng của market đã resolve ra pUSD.
- Xem lại vị thế đã đóng và lãi/lỗ thực tế.

## Điều kiện

- Panel hiện khi ví **đã deploy**.
- Nút Sell / Claim chỉ bấm được khi onboarding xong (`canTrade = currentStep === 'done'`). Nếu chưa xong mà có positions thì hiện "Finish setting up your account below to sell or claim positions."

## Phân loại positions

| Tab | Dữ liệu | Điều kiện |
| --- | --- | --- |
| **Active** | `usePolyMarketPositions()` → Data `/v2/positions?status=OPEN` | `redeemable = false` (market còn trade) |
| **Claim** | cùng nguồn trên | `redeemable = true` (market đã resolve) |
| **Closed** | `usePolyMarketClosedPositions()` → Data `/v2/positions?status=CLOSED` | Đã bán hết hoặc đã redeem |

## Luồng xử lý

### 1. Active: bán nhanh (`SellForm`)

1. Bấm **Sell** ở 1 dòng để mở form ngay dưới dòng đó. Chỉ mở 1 form tại 1 thời điểm.
2. Ô nhập là **số share** muốn bán, mặc định = toàn bộ share đang giữ (`floor2(currentSize)`). Preset `25%`, `50%`, `Max`.
3. `usePolyMarketOrderBook(tokenId)` lấy sổ lệnh, `quoteSellShares(bids, shares)` hiện "You receive ≈ $X · avg Y¢". Sổ lệnh không đủ thì hiện "Only X shares can be filled now."; không có bid thì hiện "No bids on the order book."
4. Bấm Sell:
   1. `refetchBook()` lấy sổ lệnh mới nhất.
   2. `prepareMarketOrder(tokenId, book, { side: SELL, shares, heldShares })`, slippage mặc định 5%. Validate giống tab Trade (xem [06-mua-ban.md](06-mua-ban.md)).
   3. `usePlaceMarketOrder` gửi lệnh **FAK**.
5. Kết quả: `Sold X shares for $Y.` (từ `makingAmount` / `takingAmount`). Nếu không khớp được gì thì hiện `Order placed but nothing was filled.` Bấm Done để đóng form.

### 2. Claim: redeem (`useRedeemPositions`)

- **Won**: `currentValue > 0`, hiện `Won $X` và nút **Claim**.
- **Lost**: `currentValue = 0`, hiện `Lost` và nút **Clear** (redeem không nhận tiền, chỉ để dọn vị thế khỏi danh sách).
- Có tiền thắng thì hiện banner "You have $X to claim" với nút **Claim all** (chỉ claim các vị thế thắng).

Khi bấm Claim / Clear / Claim all:
1. `getClient()` (switch Polygon nếu cần).
2. `redeemPositions(client, conditionIds, onRedeemed)` (`services/polymarket/trading`):
   - Bỏ trùng `conditionId`, chạy **lần lượt** từng market.
   - Mỗi market: `client.redeemPositions({ conditionId })`, 1 giao dịch gasless (user ký 1 lần / market), rồi `handle.wait()`.
   - Mỗi market xong thì gọi `onRedeemed(conditionId)`.
3. `onRedeemed`: xoá ngay các dòng của `conditionId` đó khỏi cache `POSITIONS` (optimistic), vì Data API cập nhật chậm.
4. Xong (thành công hay lỗi) thì `refreshAccount` invalidate positions, cash, portfolio, activity… ngay lập tức và sau 5s.

Redeem tính theo **market** (`conditionId`): 1 lần redeem đổi hết share Yes/No của market đó.

### 3. Closed

Chỉ hiển thị: Avg price, Total bought, Cost, **Realized P&L**.

## Cột hiển thị (tab Active)

`Avg → Now` (giá vốn → giá hiện tại), `Shares`, `Value` (`currentValue`), `P&L` (`totalPnl` và `percentPnl`). Tên market link sang `polymarket.com/event/<eventSlug>`.

## File liên quan

- `component/polymarket/PositionsPanel.tsx`: `PositionsPanel`, `ActivePositions`, `SellForm`, `ResolvedPositions`, `ClosedPositions`
- `component/polymarket/ProfileTab.tsx`: truyền `canTrade`
- `hooks/polymarket/account.ts`: `usePolyMarketPositions`, `usePolyMarketClosedPositions`
- `hooks/polymarket/trading.ts`: `usePlaceMarketOrder`, `useRedeemPositions`, `refreshAccount`
- `services/polymarket/trading/index.ts`: `redeemPositions`, `placeMarketOrder`
- `services/polymarket/market/index.ts`: `quoteSellShares`, `prepareMarketOrder`
- `services/polymarket/data/index.ts`: `getPositions`

## Constants

- `ORDER_SIDE`, `MARKET_ORDER_SLIPPAGE` (`services/polymarket/constants.ts`)
- Query key: `POSITIONS`, `CLOSED_POSITIONS`, `ORDER_BOOK`

## Lưu ý

- **Auto-redeem**: bước Approve đã cấp quyền cho AutoRedeemOperator (xem [01-create-wallet.md](01-create-wallet.md)), nên Polymarket có thể tự claim. Tuy nhiên chưa xác nhận backend có tự redeem cho ví tạo qua builder của app không, nên vẫn giữ Claim thủ công.
- Claim nhiều market = nhiều chữ ký (1 / market), chạy tuần tự. Lỗi giữa chừng thì các market đã claim trước đó vẫn giữ kết quả.
- `SellForm` không có nút chọn slippage, luôn dùng 5%.
- Link market đang hardcode `https://polymarket.com`, nên chuyển sang `POLYMARKET_WEB_URL`.
- `SELL_PRESETS` khai báo trong file component, chưa đưa vào constants.
