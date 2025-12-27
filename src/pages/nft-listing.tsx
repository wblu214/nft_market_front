import type { NextPage } from 'next';
import Head from 'next/head';
import { useMemo, useState, FormEvent } from 'react';
import { useAccount } from 'wagmi';

import styles from '../styles/Home.module.css';
import type { NftAsset } from '../lib/api';
import { useAssets } from '../lib/queries';
import { useListOnMarketplace } from '../lib/web3';
import { AppHeader } from '../components/AppHeader';

const NftListingPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: assets, isLoading, error } = useAssets(address);
  const listMutation = useListOnMarketplace();

  const myAssets = useMemo(() => assets ?? [], [assets]);

  const [activeAsset, setActiveAsset] = useState<NftAsset | null>(null);
  const [priceInput, setPriceInput] = useState('0.01');
  const [nftAddressInput, setNftAddressInput] = useState('');
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleOpenList = (asset: NftAsset) => {
    setActiveAsset(asset);
    setPriceInput('0.01');

    // 如果後端已回填 nft_address / token_id，則自動帶出，否則留空讓用戶手動填寫。
    const initialAddress =
      asset.nftAddress && asset.nftAddress.trim().length > 0
        ? asset.nftAddress
        : '';
    const initialTokenId =
      asset.tokenId && asset.tokenId !== 0 ? String(asset.tokenId) : '';

    setNftAddressInput(initialAddress);
    setTokenIdInput(initialTokenId);
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

    if (!nftAddressInput.trim()) {
      setFormError('请填写 NFT 合约地址。');
      return;
    }

    if (!tokenIdInput.trim()) {
      setFormError('请填写 Token ID。');
      return;
    }

    if (!priceInput) {
      setFormError('请填写价格。');
      return;
    }

    try {
      let tokenId: bigint;
      try {
        tokenId = BigInt(tokenIdInput.trim());
      } catch {
        setFormError('Token ID 需要是整数。');
        return;
      }

      await listMutation.mutate({
        nftAddress: nftAddressInput.trim(),
        tokenId,
        amount: 1,
        priceInBnb: priceInput,
      });

      setFormSuccess('挂单交易已提交，请等待链上确认和后端同步订单。');
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
                <code className={styles.inlineCode}> /api/v1/assets</code>。
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
                    为 <strong>{activeAsset.name}</strong> 设置价格，并填写 NFT
                    合约地址和 Token ID，在链上创建一个挂单。
                  </p>
                </div>
              </div>

              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    NFT 合约地址
                    <input
                      className={styles.input}
                      placeholder="例如 0xaa6a15D595bA8F69680465FBE61d9d886057Cb1E"
                      value={nftAddressInput}
                      onChange={(e) => setNftAddressInput(e.target.value)}
                    />
                  </label>
                  <p className={styles.helperText}>
                    如果后端已在 nft_assets 中回填合约地址，这里会自动填入；否则请手动填写。
                  </p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>
                    Token ID
                    <input
                      className={styles.input}
                      placeholder="链上 NFT 的 tokenId / id"
                      value={tokenIdInput}
                      onChange={(e) => setTokenIdInput(e.target.value)}
                    />
                  </label>
                  <p className={styles.helperText}>
                    如果后端已回填 token_id，这里会自动填入；否则请根据链上实际的 tokenId 填写。
                  </p>
                </div>

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
                    disabled={listMutation.isPending}
                  >
                    {listMutation.isPending
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
