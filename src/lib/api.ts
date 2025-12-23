const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:2025';

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
  nftAddress: string;
  tokenId: number;
  amount: number;
  price: string | number;
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

