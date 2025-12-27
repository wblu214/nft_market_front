// HTTP client for Gin backend (assets / orders / health).
// 所有鏈上寫操作（mint / list / buy / cancel）都通過 wagmi 在 web3.ts 中完成，
// 這裡只負責調用 Go Gin 提供的 REST API。

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
  listingId: number;
  seller: string;
  buyer: string | null;
  nftName: string | null;
  nftAddress: string;
  tokenId: number;
  amount: number;
  // 價格（wei，整數字符串），展示時再轉為 BNB。
  price: string;
  status: OrderStatus;
  txHash: string | null;
  deleted: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface NftAsset {
  id: number;
  name: string;
  owner: string;
  cid: string;
  url: string;
  tokenId: number;
  nftAddress: string;
  amount: number;
  deleted: 0 | 1;
  createdAt: string;
  updatedAt: string;
}

export interface HealthResponse {
  status: string;
}

export interface ApiError {
  message: string;
  status?: number;
  raw?: unknown;
}

export interface CreateAssetParams {
  owner: string;
  name: string;
  file: File;
}

interface BackendOrder {
  order_id: number;
  listing_id: number;
  seller: string;
  buyer: string | null;
  nft_name: string | null;
  nft_address: string;
  token_id: number;
  amount: number;
  price: string;
  status: OrderStatus;
  tx_hash: string | null;
  deleted: 0 | 1;
  created_at: string;
  updated_at: string;
}

interface BackendNftAsset {
  id: number;
  name: string;
  owner: string;
  cid: string;
  url: string;
  token_id: number;
  nft_address: string;
  amount: number;
  deleted: 0 | 1;
  created_at: string;
  updated_at: string;
}

function buildUrl(path: string): string {
  const trimmedBase = (API_BASE_URL || '').replace(/\/$/, '');
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return `${trimmedBase}${path}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...options,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = undefined;
  }

  if (!res.ok) {
    let message = 'Unexpected server error';
    if (
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as any).error === 'string'
    ) {
      message = (data as any).error;
    }

    const err: ApiError = {
      message,
      status: res.status,
      raw: data,
    };
    throw err;
  }

  return data as T;
}

// 健康檢查

export function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health', {
    method: 'GET',
  });
}

// NFT 素材（images / metadata）

function mapAsset(asset: BackendNftAsset): NftAsset {
  return {
    id: asset.id,
    name: asset.name,
    owner: asset.owner,
    cid: asset.cid,
    url: asset.url,
    tokenId: asset.token_id,
    nftAddress: asset.nft_address,
    amount: asset.amount,
    deleted: asset.deleted,
    createdAt: asset.created_at,
    updatedAt: asset.updated_at,
  };
}

export async function createAsset(
  params: CreateAssetParams,
): Promise<NftAsset> {
  const formData = new FormData();
  formData.append('owner', params.owner);
  formData.append('name', params.name);
  formData.append('file', params.file);

  const data = await request<BackendNftAsset>('/api/v1/assets', {
    method: 'POST',
    body: formData,
  });

  return mapAsset(data);
}

export async function getAsset(id: number): Promise<NftAsset> {
  const data = await request<BackendNftAsset>(`/api/v1/assets/${id}`, {
    method: 'GET',
  });
  return mapAsset(data);
}

export async function listAssets(owner: string): Promise<NftAsset[]> {
  const encodedOwner = encodeURIComponent(owner);
  const data = await request<BackendNftAsset[]>(
    `/api/v1/assets?owner=${encodedOwner}`,
    {
      method: 'GET',
    },
  );
  return data.map(mapAsset);
}

// 訂單查詢（從鏈上事件同步到 MySQL）

function mapOrder(order: BackendOrder): Order {
  return {
    orderId: order.order_id,
    listingId: order.listing_id,
    seller: order.seller,
    buyer: order.buyer,
    nftName: order.nft_name,
    nftAddress: order.nft_address,
    tokenId: order.token_id,
    amount: order.amount,
    price: order.price,
    status: order.status,
    txHash: order.tx_hash,
    deleted: order.deleted,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  };
}

export async function listOrders(): Promise<Order[]> {
  const data = await request<BackendOrder[]>('/api/v1/orders', {
    method: 'GET',
  });
  return data.map(mapOrder);
}

export async function getOrderByListingId(
  listingId: number,
): Promise<Order> {
  const data = await request<BackendOrder>(
    `/api/v1/orders/${listingId}`,
    {
      method: 'GET',
    },
  );
  return mapOrder(data);
}

