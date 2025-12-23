import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buyOrderOnChain,
  cancelOrder,
  createAsset,
  createOrder,
  getAsset,
  getOrder,
  listAssets,
  listOrderOnChainByCid,
  listOrders,
  lockOrder,
  mintErc1155,
  mintErc721,
  NftAsset,
  Order,
  OrderStatus,
  searchOrders,
  uploadToIpfs,
} from './api';

export const ordersKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus) =>
    status ? [...ordersKeys.all, 'list', status] : [...ordersKeys.all, 'list'],
  detail: (orderId: number) => [...ordersKeys.all, 'detail', orderId] as const,
  search: (keyword: string) => [...ordersKeys.all, 'search', keyword] as const,
};

export const assetsKeys = {
  all: ['assets'] as const,
  list: (owner?: string, keyword?: string) =>
    keyword
      ? [...assetsKeys.all, 'list', owner ?? 'all', keyword]
      : [...assetsKeys.all, 'list', owner ?? 'all'],
  detail: (id: number) => [...assetsKeys.all, 'detail', id] as const,
};

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ordersKeys.list(status),
    queryFn: () => listOrders(status),
    // 周期性刷新，方便观察结算状态从 SETTLING → SUCCESS
    refetchInterval: 5000,
  });
}

export function useSearchOrders(keyword: string) {
  return useQuery({
    queryKey: ordersKeys.search(keyword),
    queryFn: () => searchOrders(keyword),
    enabled: keyword.trim().length > 0,
  });
}

export function useOrder(orderId?: number) {
  return useQuery({
    queryKey: orderId ? ordersKeys.detail(orderId) : ['order', 'empty'],
    queryFn: () => (orderId ? getOrder(orderId) : Promise.reject()),
    enabled: !!orderId,
    refetchInterval: orderId ? 5000 : false,
  });
}

export function useAssets(owner?: string, keyword?: string) {
  return useQuery({
    queryKey: assetsKeys.list(owner, keyword),
    queryFn: () => listAssets({ owner, keyword }),
    enabled: !!owner,
  });
}

export function useAsset(id?: number) {
  return useQuery({
    queryKey: id ? assetsKeys.detail(id) : ['asset', 'empty'],
    queryFn: () => (id ? getAsset(id) : Promise.reject()),
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listOrderOnChainByCid,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
    },
  });
}

export function useLockAndBuy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      buyer,
    }: {
      orderId: number;
      buyer: string;
    }): Promise<Order> => {
      // 后端的 /buy-on-chain 会内部完成 lock + buy + SETTLING
      return buyOrderOnChain(orderId, buyer);
    },
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(order.orderId),
      });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ordersKeys.all });
      queryClient.invalidateQueries({
        queryKey: ordersKeys.detail(order.orderId),
      });
    },
  });
}

export function useUploadImage() {
  return useMutation({
    mutationFn: uploadToIpfs,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
  });
}

export function useMintErc721() {
  return useMutation({
    mutationFn: mintErc721,
  });
}

export function useMintErc1155() {
  return useMutation({
    mutationFn: mintErc1155,
  });
}
