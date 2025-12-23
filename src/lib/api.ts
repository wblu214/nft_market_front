// 默认走同源 /api，由 Next.js 在 next.config.js 里做反向代理到后端。
// 如需直接访问独立后端域名，可通过 NEXT_PUBLIC_API_BASE_URL 覆盖。
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export type OrderStatus =
  | 'INIT'
  | 'LISTED'
  | 'LOCKED'
  | 'SETTLING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELED';

export interface Order {
  orderId: number;
  listingId?: number | null;
  seller: string;
  buyer?: string | null;
  nftName?: string | null;
  nftAddress: string;
  tokenId: number;
  amount: number;
  price: string | number;
  status: OrderStatus;
  txHash?: string | null;
  deleted?: 0 | 1;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  code: 'ORDER_ERROR' | 'VALIDATION_ERROR' | 'INTERNAL_ERROR' | string;
  message: string;
}

export interface UploadIpfsResponse {
  cid: string;
  url: string;
}

export interface CreateOrderPayload {
  seller: string;
  name?: string;
  nftAddress: string;
  tokenId: number;
  amount: number;
  price: string | number;
}

export interface ListOnChainByCidPayload {
  seller: string;
  cid: string;
  price: string | number;
}

export interface NftAsset {
  id: number;
  name: string;
  owner: string;
  cid: string;
  url: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAssetPayload {
  name: string;
  owner: string;
  cid: string;
  url: string;
}

export interface MintErc721Response {
  tokenId: string;
}

export interface MintErc1155Response {
  txHash: string;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const err: ApiError =
      data && typeof data === 'object' && 'code' in data
        ? (data as ApiError)
        : {
            code: 'INTERNAL_ERROR',
            message: 'Unexpected server error',
          };
    throw err;
  }

  return data as T;
}

export async function uploadToIpfs(
  file: File,
): Promise<UploadIpfsResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return request<UploadIpfsResponse>('/api/ipfs/upload', {
    method: 'POST',
    body: formData,
  });
}

// 图片资产相关

export async function createAsset(
  payload: CreateAssetPayload,
): Promise<NftAsset> {
  return request<NftAsset>('/api/assets', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listAssets(params?: {
  owner?: string;
  keyword?: string;
}): Promise<NftAsset[]> {
  const search = new URLSearchParams();
  if (params?.owner) search.set('owner', params.owner);
  if (params?.keyword) search.set('keyword', params.keyword);
  const qs = search.toString();
  return request<NftAsset[]>(`/api/assets${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export async function getAsset(id: number): Promise<NftAsset> {
  return request<NftAsset>(`/api/assets/${id}`, {
    method: 'GET',
  });
}

export async function createOrder(
  payload: CreateOrderPayload,
): Promise<Order> {
  return request<Order>('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listOrderOnChain(
  payload: CreateOrderPayload,
): Promise<Order> {
  return request<Order>('/api/orders/list-on-chain', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function listOrderOnChainByCid(
  payload: ListOnChainByCidPayload,
): Promise<Order> {
  return request<Order>('/api/orders/list-on-chain/by-cid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function lockOrder(
  orderId: number,
  buyer: string,
): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/lock`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ buyer }),
  });
}

export async function buyOrderOnChain(
  orderId: number,
  buyer: string,
): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/buy-on-chain`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ buyer }),
  });
}

export async function settleOrder(
  orderId: number,
  txHash: string,
): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ txHash }),
  });
}

export async function markOrderSuccess(orderId: number): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/success`, {
    method: 'POST',
  });
}

export async function markOrderFailed(orderId: number): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/fail`, {
    method: 'POST',
  });
}

export async function cancelOrder(orderId: number): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}/cancel`, {
    method: 'POST',
  });
}

export async function getOrder(orderId: number): Promise<Order> {
  return request<Order>(`/api/orders/${orderId}`, {
    method: 'GET',
  });
}

export async function listOrders(
  status?: OrderStatus,
): Promise<Order[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<Order[]>(`/api/orders${query}`, {
    method: 'GET',
  });
}

export async function searchOrders(keyword: string): Promise<Order[]> {
  const qs = `?keyword=${encodeURIComponent(keyword)}`;
  return request<Order[]>(`/api/orders/search${qs}`, {
    method: 'GET',
  });
}

// 铸造接口：ERC721 / ERC1155

export async function mintErc721(payload: {
  to: string;
  uri: string;
}): Promise<MintErc721Response> {
  return request<MintErc721Response>('/api/tokens/erc721/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function mintErc1155(payload: {
  to: string;
  id: string;
  amount: string;
  uri: string;
}): Promise<MintErc1155Response> {
  return request<MintErc1155Response>('/api/tokens/erc1155/mint', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
