# Smart7702: không tự upgrade 7702, chỉ upgrade khi user bấm nút

- Ngày: 2026-10-05
- Phạm vi: smart7702 (trang `/smart7702`, hook `useERC7702`)

## Mục đích
Khi vào lại trang, nếu account chưa là 7702 thì chỉ check trạng thái và hiện nút "Upgrade to Smart Account". Không được tự upgrade (tự gửi authorization 7702) khi user chưa bấm nút.

Trước đây `canBatch` = true cả khi `atomic.status = ready` (EOA thường). Lúc đó gửi transfer đi qua `wallet_sendCalls` + `forceAtomic` → ví tự upgrade EOA lên 7702 trong cùng tx, dù user không bấm Upgrade.

## Luồng xử lý
1. Vào trang: chỉ đọc code của EOA (`getCode`) + `wallet_getCapabilities` để biết trạng thái, không gửi tx nào.
2. Chưa delegate → hiện card "Upgrade to Smart Account"; chỉ khi bấm nút mới gọi `upgrade()`.
3. `canBatch` chỉ true khi `atomic.status = supported` (đã là smart account).
4. Status `ready` (EOA thường) → gửi transfer từng tx một (`sendSequential`), kèm gợi ý upgrade trước nếu muốn batch.

## File liên quan
- `hooks/useERC7702.ts` — `canBatch` bỏ `ready`; `sendTransfers` bỏ refetch delegation sau batch (không còn upgrade ngầm).
- `app/smart7702/page.tsx` — text gợi ý trên card Send khi status `ready`.

## Constants / Translation keys mới
- Không có.

## Lưu ý
- Text trên trang vẫn hardcode như phần còn lại của trang (repo chưa có `useLanguage`).
