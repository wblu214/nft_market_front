import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, FormEvent } from 'react';
import { useAccount } from 'wagmi';

import styles from '../styles/Home.module.css';
import {
  useCreateAsset,
  useMintErc1155,
  useMintErc721,
  useUploadImage,
} from '../lib/queries';
import { AppHeader } from '../components/AppHeader';

const CreateNftPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const uploadMutation = useUploadImage();
  const createAssetMutation = useCreateAsset();
  const mint721Mutation = useMintErc721();
  const mint1155Mutation = useMintErc1155();

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
      // 1. 上传图片到 IPFS
      const ipfs = await uploadMutation.mutateAsync(imageFile);
      setUploadedUrl(ipfs.url);

      // 2. 创建图片资产记录，用于「我的图片」页面
      const asset = await createAssetMutation.mutateAsync({
        name,
        owner: address,
        cid: ipfs.cid,
        url: ipfs.url,
        amount: amountNum,
      });

      // 3. 根据数量自动选择 ERC721 / ERC1155 合约进行 mint
      if (amountNum === 1) {
        const res721 = await mint721Mutation.mutateAsync({
          to: address,
          uri: ipfs.url,
        });
        setFormSuccess(
          `已使用 ERC721 合约铸造 1 个 NFT（tokenId=${res721.tokenId}），并保存到「我的图片」。`,
        );
      } else {
        await mint1155Mutation.mutateAsync({
          to: address,
          id: String(asset.id),
          amount: String(amountNum),
          uri: ipfs.url,
        });
        setFormSuccess(
          `已使用 ERC1155 合约铸造 ${amountNum} 个 NFT（id=${asset.id}），并保存到「我的图片」。`,
        );
      }
    } catch (err: any) {
      setFormError(err?.message || '上传失败，请稍后重试。');
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
                  uploadMutation.isPending ||
                  createAssetMutation.isPending ||
                  mint721Mutation.isPending ||
                  mint1155Mutation.isPending
                }
              >
                {uploadMutation.isPending ||
                createAssetMutation.isPending ||
                mint721Mutation.isPending ||
                mint1155Mutation.isPending
                  ? '处理中…'
                  : '上传并铸造 NFT'}
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
