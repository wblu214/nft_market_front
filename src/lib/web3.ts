import { useQueryClient } from '@tanstack/react-query';
import { useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { readContract } from '@wagmi/core';

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
import { config } from '../wagmi';

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
  // NFT 當前持有者（調用 list 的錢包地址）
  owner: string;
}

export function useListOnMarketplace() {
  const queryClient = useQueryClient();
  const { writeContractAsync, isPending, error } = useWriteContract();

  const mutate = async ({
    nftAddress,
    tokenId,
    amount,
    priceInBnb,
    owner,
  }: ListOnMarketplaceParams) => {
    // 先確保對應 NFT 合約已對 Marketplace 做 setApprovalForAll 授權
    const lowerNft = nftAddress.toLowerCase();
    const isErc1155 =
      lowerNft === PROJECT_1155_ADDRESS.toLowerCase();
    const nftAbi = isErc1155 ? project1155Abi : projectNftAbi;

    const approved = (await readContract(config, {
      abi: nftAbi as any,
      address: nftAddress as `0x${string}`,
      functionName: 'isApprovedForAll',
      args: [
        owner as `0x${string}`,
        NFT_MARKETPLACE_ADDRESS as `0x${string}`,
      ] as const,
    })) as boolean;

    if (!approved) {
      // 調用 setApprovalForAll(NFTMarketplace, true)
      await writeContractAsync({
        abi: nftAbi,
        address: nftAddress as `0x${string}`,
        functionName: 'setApprovalForAll',
        args: [
          NFT_MARKETPLACE_ADDRESS as `0x${string}`,
          true,
        ],
      });
    }

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
    // writeContractAsync 返回交易 hash，本 hook 不關心返回值，
    // 具體的 tokenId 由調用方根據合約邏輯自行推導或通過其他接口獲取。
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
