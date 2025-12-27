import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createAsset,
  getAsset,
  listAssets,
  listOrders,
  NftAsset,
  Order,
  OrderStatus,
} from './api';

export const ordersKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus) =>
    status ? [...ordersKeys.all, 'list', status] : [...ordersKeys.all, 'list'],
  detail: (orderId: number) => [...ordersKeys.all, 'detail', orderId] as const,
};

export const assetsKeys = {
  all: ['assets'] as const,
  list: (owner?: string) => [...assetsKeys.all, 'list', owner ?? 'all'] as const,
  detail: (id: number) => [...assetsKeys.all, 'detail', id] as const,
};

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ordersKeys.list(status),
    // 後端暫不支持按狀態查詢，這裡在前端做一次過濾。
    queryFn: async (): Promise<Order[]> => {
      const orders = await listOrders();
      if (!status) return orders;
      return orders.filter((o) => o.status === status);
    },
    // 周期性刷新，方便观察结算状态从 SETTLING → SUCCESS
    refetchInterval: 5000,
  });
}

export function useAssets(owner?: string) {
  return useQuery({
    queryKey: assetsKeys.list(owner),
    queryFn: () => (owner ? listAssets(owner) : Promise.resolve([])),
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

export function useCreateAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKeys.all });
    },
  });
}
