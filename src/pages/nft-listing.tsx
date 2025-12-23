import type { NextPage } from 'next';
import Head from 'next/head';
import { useMemo, useState, FormEvent } from 'react';
import { useAccount } from 'wagmi';

import styles from '../styles/Home.module.css';
import type { NftAsset } from '../lib/api';
import { useAssets, useCreateListing } from '../lib/queries';
import { AppHeader } from '../components/AppHeader';

const NftListingPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: assets, isLoading, error } = useAssets(address);
  const createListingMutation = useCreateListing();

  const myAssets = useMemo(() => assets ?? [], [assets]);

  const [activeAsset, setActiveAsset] = useState<NftAsset | null>(null);
  const [priceInput, setPriceInput] = useState('0.01');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleOpenList = (asset: NftAsset) => {
    setActiveAsset(asset);
    setPriceInput('0.01');
    setFormError(null);
    setFormSuccess(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isConnected || !address) {
      setFormError('请先连接钱包。');
      return;
    }

    if (!activeAsset) {
      setFormError('缺少要上架的 NFT 资产信息。');
      return;
    }

    if (!priceInput) {
      setFormError('请填写价格。');
      return;
    }

    try {
      const order = await createListingMutation.mutateAsync({
        seller: address,
        cid: activeAsset.cid,
        price: priceInput,
      });

      setFormSuccess(`挂单成功，订单号 #${order.orderId}。`);
      setPriceInput('0.01');
      setActiveAsset(null);
    } catch (err: any) {
      setFormError(err?.message || '创建订单失败，请稍后重试。');
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>My NFTs · Charity NFT</title>
      </Head>

      <AppHeader active="myNft" />

      <main className={styles.main}>
        <section className={styles.fullWidthSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>My NFTs</h2>
              <p className={styles.sectionSubtitle}>
                你已经铸造（或上传）的 NFT 资产列表，数据来自
                <code className={styles.inlineCode}> /api/assets</code>。
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className={styles.placeholder}>请先连接钱包。</div>
          )}

          {isConnected && isLoading && (
            <div className={styles.placeholder}>加载中…</div>
          )}

          {isConnected && error && (
            <div className={styles.errorBox}>加载失败，请稍后重试。</div>
          )}

          {isConnected &&
            !isLoading &&
            !error &&
            myAssets.length === 0 && (
              <div className={styles.placeholder}>
                当前钱包地址还没有 NFT 资产。
              </div>
            )}

          <div className={styles.cardRow}>
            {myAssets.map((asset) => (
              <article key={asset.id} className={styles.marketCard}>
                <div className={styles.marketCardImage}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.name} />
                </div>
                <div className={styles.marketCardBody}>
                  <div className={styles.marketCardHeader}>
                    <h3 className={styles.marketCardTitle}>{asset.name}</h3>
                  </div>
                  <div className={styles.marketCardMeta}>
                    <span className={styles.marketCardLabel}>Owner</span>
                    <span className={styles.marketCardOwner}>
                      {shortAddress(asset.owner)}
                    </span>
                  </div>
                  <div className={styles.marketCardMeta}>
                    <span className={styles.marketCardLabel}>CID</span>
                    <span className={styles.marketCardOwner}>
                      {shortText(asset.cid)}
                    </span>
                  </div>
                </div>
                <div className={styles.marketCardFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled
                  >
                    下架
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={!isConnected}
                    onClick={() => handleOpenList(asset)}
                  >
                    上架
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {activeAsset && (
          <div className={styles.modalBackdrop}>
            <div className={styles.modalCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>List NFT on Marketplace</h2>
                  <p className={styles.sectionSubtitle}>
                    为 <strong>{activeAsset.name}</strong> 设置价格，使用其 CID
                    在链上创建一个挂单。
                  </p>
                </div>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    挂单价格（BNB）
                    <input
                      className={styles.input}
                      placeholder="例如 0.01"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                    />
                  </label>
                </div>

                {formError && (
                  <div className={styles.errorBox}>{formError}</div>
                )}
                {formSuccess && (
                  <div className={styles.successBox}>{formSuccess}</div>
                )}

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => setActiveAsset(null)}
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={createListingMutation.isPending}
                  >
                    {createListingMutation.isPending
                      ? '创建挂单中…'
                      : '确认上架'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

function shortAddress(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function shortText(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export default NftListingPage;
