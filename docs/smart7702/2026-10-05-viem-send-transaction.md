# Smart7702: chuyển sang viem thuần + useSendTransaction

- Ngày: 2026-10-05
- Phạm vi: smart7702 (trang `/smart7702`, hook `useERC7702`)

## Mục đích
- Hạn chế hook wagmi: mọi bước build data / đọc chain dùng viem thuần, wagmi chỉ dùng để gửi request tới ví (WalletConnect/AppKit).
- Bỏ `useSendCalls` (EIP-5792), thay bằng `useSendTransaction`.

## Luồng xử lý
1. Hook wagmi còn giữ: `useConnection`, `useSendTransaction`, `useSignMessage`, `useSignTypedData`, `useDisconnect`.
   Đã bỏ: `useBytecode`, `useCapabilities`, `usePublicClient`, `useSendCalls`, `useWaitForCallsStatus`.
2. Đọc chain: `createPublicClient({ chain, transport: http() })` của viem (chain lấy từ `useConnection`).
   - Trạng thái delegation: `useQuery` + `publicClient.getCode`, key `REACT_QUERY_ERC7702.DELEGATION`.
   - Receipt: `publicClient.waitForTransactionReceipt`.
   - Verify chữ ký: `publicClient.verifyMessage` / `verifyTypedData`.
3. Upgrade: `eth_sendTransaction` không mang được authorization 7702 và ví không cho dapp ký authorization → user upgrade trong ví (MetaMask → Account details → Smart account), sau đó bấm "check again" (`refreshDelegation`) để đọc lại code của EOA.
4. Gửi transfer (`sendTransfers`):
   - Đã là smart account (delegate = `EIP7702StatelessDeleGatorImpl`) → 1 tx gửi tới chính mình, data = `execute(ERC7579_BATCH_MODE, abi.encode(Execution[]))` (atomic).
   - Chưa upgrade / delegate contract khác → gửi lần lượt từng tx, mỗi tx chờ receipt rồi mới gửi tx tiếp; tx revert thì dừng.
   - Danh sách tx + trạng thái trả ra qua `txs` (hiển thị ở card "Last Transactions").

## File liên quan
- `hooks/useERC7702.ts` — viết lại theo viem thuần, bỏ `upgrade`, `checkDismissed`, `atomicStatus`, `callsStatus`, `callsError`; thêm `refreshDelegation`, `txs`.
- `constants/erc7702.ts` — ABI `execute`, mode batch ERC-7579, layout `Execution[]`, `TX_STATUS`.
- `constants/reactQuery.ts` — enum `REACT_QUERY_ERC7702`.
- `app/smart7702/page.tsx` — card Upgrade đổi thành hướng dẫn + nút kiểm tra; card Dismiss dùng `refreshDelegation`; card tx mới.

## Constants / Translation keys mới
- `REACT_QUERY_ERC7702.DELEGATION`, `ERC7579_BATCH_MODE`, `ERC7579_EXECUTIONS_PARAMS`, `DELEGATOR_EXECUTE_ABI`, `TX_STATUS`.

## Lưu ý
- MetaMask có thể chặn tx do dapp gửi tới chính account của user mà có data ("External transactions to internal accounts cannot include data") → batch self-call có thể không chạy trên MetaMask, ví WalletConnect khác thì tuỳ ví.
- Gửi lần lượt không atomic: tx trước đã thành công thì không rollback nếu tx sau lỗi/bị từ chối.
- Text trên trang vẫn hardcode (chưa có `useLanguage`), giống log trước.
