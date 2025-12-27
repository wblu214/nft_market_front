import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, FormEvent } from 'react';
import { useAccount } from 'wagmi';

import styles from '../styles/Home.module.css';
import { useCreateAsset } from '../lib/queries';
import { useMintErc1155, useMintErc721 } from '../lib/web3';
import { updateAssetMintInfo } from '../lib/api';
import {
  PROJECT_1155_ADDRESS,
  PROJECT_NFT_ADDRESS,
  projectNftAbi,
} from '../lib/contracts';
import { readContract } from '@wagmi/core';
import { config } from '../wagmi';
import { AppHeader } from '../components/AppHeader';

const CreateNftPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const createAssetMutation = useCreateAsset();
  const mintErc721Mutation = useMintErc721();
  const mintErc1155Mutation = useMintErc1155();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('1');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setUploadedUrl(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isConnected || !address) {
      setFormError('请先连接钱包（仅支持 BSC Mainnet / Testnet）。');
      return;
    }

    if (!name.trim()) {
      setFormError('请填写 NFT 名称。');
      return;
    }

    if (!imageFile) {
      setFormError('请先选择一张图片。');
      return;
    }

    const amountNum = Number(amount || '1');
    if (Number.isNaN(amountNum) || amountNum <= 0) {
      setFormError('数量需要是大于 0 的整数。');
      return;
    }

    try {
      // 1. 調用 Gin 後端接口，上傳圖片並創建素材記錄（會同步到 IPFS）
      const asset = await createAssetMutation.mutateAsync({
        owner: address,
        name,
        file: imageFile,
      });
      setUploadedUrl(asset.url);

      // 2. 使用素材 URL 作為鏈上 NFT 的 metadata / image，通過錢包完成 mint
      const uri = asset.url;

      if (amountNum === 1) {
        // 對於 ERC721，先讀取 nextTokenId，實際鑄造的 tokenId = nextTokenId + 1（按後端約定）
        const nextTokenId = (await readContract(config, {
          abi: projectNftAbi as any,
          address: PROJECT_NFT_ADDRESS as `0x${string}`,
          functionName: 'nextTokenId',
          args: [] as const,
        })) as bigint;

        const mintedTokenId = Number(nextTokenId) + 1;

        await mintErc721Mutation.mutate({
          to: address,
          uri,
        });

        // 3. mint 成功後，把 tokenId / nftAddress / amount 回傳給後端
        await updateAssetMintInfo(asset.id, {
          tokenId: mintedTokenId,
          nftAddress: PROJECT_NFT_ADDRESS,
          amount: 1,
        });
      } else {
        // 對於 ERC1155，這裡簡單使用素材在資料庫中的 id 作為 token id
        await mintErc1155Mutation.mutate({
          to: address,
          id: asset.id,
          amount: amountNum,
          uri,
        });

        await updateAssetMintInfo(asset.id, {
          tokenId: asset.id,
          nftAddress: PROJECT_1155_ADDRESS,
          amount: amountNum,
        });
      }

      setFormSuccess(
        amountNum === 1
          ? '圖片已上傳並完成 ERC721 鑄造，並已同步到後端。'
          : `圖片已上傳並完成 ERC1155 鑄造（數量 ${amountNum}），並已同步到後端。`,
      );
    } catch (err: any) {
      setFormError(err?.message || '上傳或鑄造失敗，請稍後重試。');
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Create NFT · Charity NFT</title>
      </Head>

      <AppHeader active="create" />

      <main className={styles.main}>
        <section className={styles.fullWidthSection}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Create & Mint NFT</h2>
                <p className={styles.sectionSubtitle}>
                  上传图片 → 保存到 IPFS & 数据库 → 根据数量自动选择 ERC721 /
                  ERC1155 完成 mint。
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  名称
                  <input
                    className={styles.input}
                    placeholder="例如 Cool NFT #1"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.formInline}>
                <label className={styles.label}>
                  数量
                  <input
                    className={styles.input}
                    placeholder="1 表示铸造 ERC721，大于等于 2 会铸造 ERC1155"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  NFT 图片
                  <div className={styles.fileInputWrapper}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        handleImageChange(
                          e.target.files?.[0] ? e.target.files[0] : null,
                        )
                      }
                    />
                  </div>
                </label>
                {imagePreview && (
                  <div className={styles.imagePreview}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="预览" />
                  </div>
                )}
              </div>

              {formError && (
                <div className={styles.errorBox}>{formError}</div>
              )}
              {formSuccess && (
                <div className={styles.successBox}>{formSuccess}</div>
              )}

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={
                  createAssetMutation.isPending ||
                  mintErc721Mutation.isPending ||
                  mintErc1155Mutation.isPending
                }
              >
                {createAssetMutation.isPending ||
                mintErc721Mutation.isPending ||
                mintErc1155Mutation.isPending
                  ? '处理中…'
                  : '上传并铸造'}
              </button>

              {uploadedUrl && (
                <p className={styles.helperText}>
                  已上传成功，你可以将此 URL 写入 NFT 元数据：{' '}
                  <a href={uploadedUrl} target="_blank" rel="noreferrer">
                    {uploadedUrl}
                  </a>
                </p>
              )}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
};

export default CreateNftPage;
