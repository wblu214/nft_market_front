import { useQueryClient } from '@tanstack/react-query';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

import {
  NFT_MARKETPLACE_ADDRESS,
  PROJECT_1155_ADDRESS,
  PROJECT_NFT_ADDRESS,
  nftMarketplaceAbi,
  project1155Abi,
  projectNftAbi,
} from './contracts';
import { ordersKeys } from './queries';
import type { Order } from './api';

// 基於 wagmi 的簡單封裝，把常用鏈上操作包裝成 mutation 風格的 hook，
// 方便在頁面中與現有的 React Query 用法對齊。

// -----------------------
// NFTMarketplace: buy / cancel / list
// -----------------------

export function useBuyListing() {
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async ({ order }: { order: Order }) => {
    if (!order.listingId) {
      throw new Error('缺少 listingId，無法調用 NFTMarketplace.buy');
    }

    const listingId = BigInt(order.listingId);
    const value = BigInt(order.price);

    await writeContractAsync({
      abi: nftMarketplaceAbi,
      address: NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      functionName: 'buy',
      args: [listingId],
      value,
    });

    // 交給後端事件同步，這裡只主動刷新一次列表
    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
  };

  return { mutate, isPending, error };
}

export function useCancelListing() {
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async (order: Order) => {
    if (!order.listingId) {
      throw new Error('缺少 listingId，無法調用 NFTMarketplace.cancel');
    }

    const listingId = BigInt(order.listingId);

    await writeContractAsync({
      abi: nftMarketplaceAbi,
      address: NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      functionName: 'cancel',
      args: [listingId],
    });

    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
  };

  return { mutate, isPending, error };
}

export interface ListOnMarketplaceParams {
  nftAddress: string;
  tokenId: string | number | bigint;
  amount: string | number | bigint;
  // 價格（BNB，字符串），將會轉成 wei
  priceInBnb: string;
}

export function useListOnMarketplace() {
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async ({
    nftAddress,
    tokenId,
    amount,
    priceInBnb,
  }: ListOnMarketplaceParams) => {
    const listingTokenId =
      typeof tokenId === 'bigint' ? tokenId : BigInt(tokenId);
    const listingAmount =
      typeof amount === 'bigint' ? amount : BigInt(amount);
    const priceWei = parseEther(priceInBnb);

    await writeContractAsync({
      abi: nftMarketplaceAbi,
      address: NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      functionName: 'list',
      args: [nftAddress as `0x${string}`, listingTokenId, listingAmount, priceWei],
    });

    queryClient.invalidateQueries({ queryKey: ordersKeys.all });
  };

  return { mutate, isPending, error };
}

// -----------------------
// ProjectNFT / Project1155: mint
// -----------------------

export interface MintErc721Params {
  to: string;
  uri: string;
}

export function useMintErc721() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async ({ to, uri }: MintErc721Params) => {
    return writeContractAsync({
      abi: projectNftAbi,
      address: PROJECT_NFT_ADDRESS as `0x${string}`,
      functionName: 'mint',
      args: [to as `0x${string}`, uri],
    });
  };

  return { mutate, isPending, error };
}

export interface MintErc1155Params {
  to: string;
  id: string | number | bigint;
  amount: string | number | bigint;
  uri: string;
}

export function useMintErc1155() {
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async ({
    to,
    id,
    amount,
    uri,
  }: MintErc1155Params) => {
    const tokenId = typeof id === 'bigint' ? id : BigInt(id);
    const mintAmount =
      typeof amount === 'bigint' ? amount : BigInt(amount);

    return writeContractAsync({
      abi: project1155Abi,
      address: PROJECT_1155_ADDRESS as `0x${string}`,
      functionName: 'mint',
      args: [to as `0x${string}`, tokenId, mintAmount, uri],
    });
  };

  return { mutate, isPending, error };
}
