import type { NextPage } from 'next';
import Head from 'next/head';
import { useMemo, useState, FormEvent } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';

import styles from '../styles/Home.module.css';
import type { Order, OrderStatus } from '../lib/api';
import {
  useCancelOrder,
  useCreateListing,
  useOrders,
} from '../lib/queries';
import { AppHeader } from '../components/AppHeader';

const NftListingPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const createListingMutation = useCreateListing();
  const cancelMutation = useCancelOrder();
  const { data: allOrders } = useOrders();

  const myOrders = useMemo(() => {
    if (!allOrders || !address) return [];
    return allOrders.filter(
      (o) => o.seller?.toLowerCase() === address.toLowerCase(),
    );
  }, [allOrders, address]);

  const [nftAddressInput, setNftAddressInput] = useState('');
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [amountInput, setAmountInput] = useState('1');
  const [priceInput, setPriceInput] = useState('0.01');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isConnected || !address) {
      setFormError('请先连接钱包。');
      return;
    }

    if (!nftAddressInput || !tokenIdInput || !amountInput || !priceInput) {
      setFormError('请完整填写合约地址、Token ID、数量和价格。');
      return;
    }

    const tokenId = Number(tokenIdInput);
    const amount = Number(amountInput);

    if (Number.isNaN(tokenId) || tokenId < 0) {
      setFormError('Token ID 需要是非负整数。');
      return;
    }

    if (Number.isNaN(amount) || amount <= 0) {
      setFormError('数量需要是大于 0 的整数。');
      return;
    }

    let priceInWei: string;
    try {
      priceInWei = parseEther(priceInput).toString();
    } catch {
      setFormError('价格格式不正确，请输入合法的 BNB 数量，例如 0.01。');
      return;
    }

    try {
      const order = await createListingMutation.mutateAsync({
        seller: address,
        nftAddress: nftAddressInput,
        tokenId,
        amount,
        price: priceInWei,
      });

      setFormSuccess(`挂单成功，订单号 #${order.orderId}。`);
      setTokenIdInput('');
      setAmountInput('1');
      setPriceInput('0.01');
    } catch (err: any) {
      setFormError(err?.message || '创建订单失败，请稍后重试。');
    }
  };

  const formatPrice = (price: string | number) => {
    try {
      const wei =
        typeof price === 'string'
          ? BigInt(price)
          : BigInt(Math.trunc(price as number));
      const bnb = Number(formatEther(wei));
      return `${bnb.toLocaleString(undefined, {
        maximumFractionDigits: 4,
      })} BNB`;
    } catch {
      return `${price} wei`;
    }
  };

  const renderStatusTag = (status: OrderStatus) => {
    switch (status) {
      case 'LISTED':
        return <span className={styles.tagListed}>已上架</span>;
      case 'LOCKED':
        return <span className={styles.tagLocked}>已锁定</span>;
      case 'SETTLING':
        return <span className={styles.tagSettling}>结算中</span>;
      case 'SUCCESS':
        return <span className={styles.tagSuccess}>已成交</span>;
      case 'CANCELED':
        return <span className={styles.tagCanceled}>已下架</span>;
      case 'FAILED':
        return <span className={styles.tagFailed}>失败</span>;
      default:
        return <span className={styles.tagMuted}>{status}</span>;
    }
  };

  const handleUnlist = (orderId: number) => {
    cancelMutation.mutate(orderId);
  };

  const handleRelist = (order: Order) => {
    if (!address) return;
    createListingMutation.mutate({
      seller: address,
      nftAddress: order.nftAddress,
      tokenId: order.tokenId,
      amount: order.amount,
      price: order.price,
    });
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>List NFT · Charity NFT</title>
      </Head>

      <AppHeader active="myNft" />

      <main className={styles.main}>
        <section className={styles.fullWidthSection}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>List NFT on Marketplace</h2>
                <p className={styles.sectionSubtitle}>
                  使用已铸造好的 NFT（合约地址 + Token ID），在 BSC
                  上架到后端托管的 Marketplace。
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  NFT 合约地址
                  <input
                    className={styles.input}
                    placeholder="0x..."
                    value={nftAddressInput}
                    onChange={(e) => setNftAddressInput(e.target.value)}
                  />
                </label>
              </div>

              <div className={styles.formInline}>
                <label className={styles.label}>
                  Token ID
                  <input
                    className={styles.input}
                    placeholder="例如 1"
                    value={tokenIdInput}
                    onChange={(e) => setTokenIdInput(e.target.value)}
                  />
                </label>

                <label className={styles.label}>
                  数量
                  <input
                    className={styles.input}
                    placeholder="默认为 1"
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value)}
                  />
                </label>
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

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={createListingMutation.isPending}
              >
                {createListingMutation.isPending
                  ? '创建挂单中…'
                  : '一键上架到 Marketplace'}
              </button>
            </form>
          </div>
        </section>

        <section className={styles.fullWidthSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>My NFTs</h2>
              <p className={styles.sectionSubtitle}>
                你创建的 NFT 按卡片展示，可在这里直接上架 / 下架。
              </p>
            </div>
          </div>

          {!isConnected && (
            <div className={styles.placeholder}>请先连接钱包。</div>
          )}

          {isConnected && myOrders.length === 0 && (
            <div className={styles.placeholder}>
              当前钱包地址还没有创建任何订单。
            </div>
          )}

          <div className={styles.cardRow}>
            {myOrders.map((order) => (
              <article key={order.orderId} className={styles.marketCard}>
                <div className={styles.marketCardImage} />
                <div className={styles.marketCardBody}>
                  <div className={styles.marketCardHeader}>
                    <h3 className={styles.marketCardTitle}>
                      Token {order.tokenId}
                    </h3>
                    {renderStatusTag(order.status)}
                  </div>
                  <div className={styles.marketCardMeta}>
                    <span className={styles.marketCardLabel}>合约地址</span>
                    <span className={styles.marketCardOwner}>
                      {shortAddress(order.nftAddress)}
                    </span>
                  </div>
                  <div className={styles.marketCardMeta}>
                    <span className={styles.marketCardLabel}>Price</span>
                    <span className={styles.marketCardPrice}>
                      {formatPrice(order.price)}
                    </span>
                  </div>
                </div>
                <div className={styles.marketCardFooter}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    disabled={
                      order.status !== 'LISTED' || cancelMutation.isPending
                    }
                    onClick={() => handleUnlist(order.orderId)}
                  >
                    下架
                  </button>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    disabled={
                      order.status !== 'CANCELED' ||
                      createListingMutation.isPending
                    }
                    onClick={() => handleRelist(order)}
                  >
                    上架
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default NftListingPage;

function shortAddress(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}
