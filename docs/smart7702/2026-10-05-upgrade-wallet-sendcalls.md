# Smart7702: nút Upgrade lên 7702 qua wallet_sendCalls (mọi ví)

- Ngày: 2026-10-05
- Phạm vi: smart7702 (trang `/smart7702`, hook `useERC7702`)

## Mục đích
- Ví của user là EOA thường, web cần có chức năng upgrade lên 7702 dùng contract của MetaMask (`EIP7702StatelessDeleGatorImpl` v1.3.0).
- Phải chạy được với cả ví extension lẫn WalletConnect, không chỉ riêng MetaMask (bỏ hướng dẫn kiểu "MetaMask → Account details").

## Luồng xử lý
1. Dapp không ký được authorization 7702 (không có RPC chuẩn, ví chặn có chủ đích) → dùng `wallet_sendCalls` (EIP-5792) với `forceAtomic`, ví tự ký authorization + gửi tx type-4.
2. Wallet client: viem `createWalletClient({ transport: custom(await connector.getProvider()) })` — provider của connector đang kết nối (injected hoặc WalletConnect).
3. Capabilities: `walletClient.getCapabilities` → `atomic.status` (`ATOMIC_STATUS`), cache bằng `REACT_QUERY_ERC7702.CAPABILITIES`. Ví không hỗ trợ EIP-5792 (throw) → coi là `unsupported`.
4. `upgrade()`:
   - Chặn nếu chain không hỗ trợ, EOA đã delegate, hoặc `atomic.status !== ready`.
   - Gửi 1 call rỗng tới chính mình (`value = 0`) với `forceAtomic` → chờ `waitForCallsStatus` → refetch code + capabilities.
5. `sendTransfers()`:
   - `atomic.status` = `ready`/`supported` → gửi cả batch 1 lần qua `wallet_sendCalls` (atomic). Nếu đang `ready` thì ví upgrade luôn trong lần gửi này → refetch delegation.
   - Ngược lại → gửi lần lượt từng tx như cũ.
6. UI: card Upgrade có nút "Upgrade to Smart Account" (chỉ hiện khi EOA chưa delegate), card Account thêm dòng "Wallet 7702 support"; card Dismiss bỏ hướng dẫn riêng MetaMask.

## File liên quan
- `hooks/useERC7702.ts` — thêm `upgrade`, `isUpgrading`, `atomicStatus`, `canBatch`, `sendAtomic`; bỏ batch self-call `execute()`.
- `constants/erc7702.ts` — thêm `ATOMIC_STATUS`, `CALLS_STATUS`; bỏ `ERC7579_BATCH_MODE`, `ERC7579_EXECUTIONS_PARAMS`, `DELEGATOR_EXECUTE_ABI`.
- `constants/reactQuery.ts` — thêm `REACT_QUERY_ERC7702.CAPABILITIES`.
- `app/smart7702/page.tsx` — nút Upgrade, trạng thái hỗ trợ của ví, text chung cho mọi ví.

## Constants / Translation keys mới
- `ATOMIC_STATUS`, `CALLS_STATUS`, `REACT_QUERY_ERC7702.CAPABILITIES`.

## Lưu ý
- Contract được delegate do ví quyết định: MetaMask (extension, mobile qua WalletConnect) → DeleGator v1.3.0; ví khác → implementation riêng của họ. UI hiển thị "Smart account (wallet implementation 0x…)" cho trường hợp này.
- Muốn bắt buộc DeleGator với mọi ví thì chỉ có cách web giữ private key (viem `signAuthorization`) — không áp dụng cho extension/WalletConnect.
- Bỏ batch self-call `execute()` vì MetaMask chặn tx gửi tới chính account có data.
- Text trên trang vẫn hardcode (repo chưa có `useLanguage`/file ngôn ngữ).
