import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  buyOrderOnChain,
  cancelOrder,
  createOrder,
  getOrder,
  listOrderOnChain,
  listOrders,
  lockOrder,
  Order,
  OrderStatus,
  uploadToIpfs,
} from './api';

export const ordersKeys = {
  all: ['orders'] as const,
  list: (status?: OrderStatus) =>
    status ? [...ordersKeys.all, 'list', status] : [...ordersKeys.all, 'list'],
  detail: (orderId: number) => [...ordersKeys.all, 'detail', orderId] as const,
};

export function useOrders(status?: OrderStatus) {
  return useQuery({
    queryKey: ordersKeys.list(status),
    queryFn: () => listOrders(status),
    // 周期性刷新，方便观察结算状态从 SETTLING → SUCCESS
    refetchInterval: 5000,
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

export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: listOrderOnChain,
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
