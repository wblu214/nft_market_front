import { useMemo } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';

import styles from '../styles/Home.module.css';
import type { Order, OrderStatus } from '../lib/api';
import { useOrders } from '../lib/queries';
import { useBuyListing } from '../lib/web3';
import { AppHeader } from '../components/AppHeader';

const DEFAULT_STATUS: OrderStatus = 'LISTED';

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: orders, isLoading, error } = useOrders(DEFAULT_STATUS);
  const buyMutation = useBuyListing();

  const listedOrders = useMemo(() => orders ?? [], [orders]);

  const handleBuy = (order: Order) => {
    if (!address) return;
    buyMutation.mutate({ order, buyer: address });
  };

  const formatPrice = (priceWei: string) => {
    try {
      const bnb = formatEther(BigInt(priceWei));
      return `${bnb} BNB`;
    } catch {
      return `${priceWei} wei`;
    }
  };

  const renderStatusTag = (status: OrderStatus) => {
    switch (status) {
      case 'LISTED':
        return <span className={styles.tagListed}>可购买</span>;
      case 'LOCKED':
        return <span className={styles.tagLocked}>已锁定</span>;
      case 'SETTLING':
        return <span className={styles.tagSettling}>结算中</span>;
      case 'SUCCESS':
        return <span className={styles.tagSuccess}>已成交</span>;
      case 'CANCELED':
        return <span className={styles.tagCanceled}>已取消</span>;
      case 'FAILED':
        return <span className={styles.tagFailed}>失败</span>;
      default:
        return <span className={styles.tagMuted}>{status}</span>;
    }
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>Charity NFT Marketplace · BSC</title>
        <meta
          name="description"
          content="A clean and modern NFT marketplace on BSC, powered by a trading module backend."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <AppHeader active="market" />

      <main className={styles.main}>
        <section className={styles.fullWidthSection}>
          <div className={styles.sectionHeader}>
            <div>
              <h1 className={styles.activityHeading}>New Additions</h1>
            </div>
            <button type="button" className={styles.seeMoreButton}>
              See More
            </button>
          </div>

          {isLoading && (
            <div className={styles.placeholder}>加载订单中…</div>
          )}

          {error && (
            <div className={styles.errorBox}>
              加载失败，请确认後端 Gin 服務已啟動並且
              <code className={styles.inlineCode}> /health </code>
              返回正常。
            </div>
          )}

          {!isLoading && !error && listedOrders.length === 0 && (
            <div className={styles.placeholder}>
              暂无挂单，可在「Create NFT / See Collections」中创建挂单。
            </div>
          )}

          <div className={styles.cardRow}>
            {listedOrders.map((order) => (
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
                    <span className={styles.marketCardLabel}>Owned by user</span>
                    <span className={styles.marketCardOwner}>
                      {shortAddress(order.seller)}
                    </span>
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
                    className={styles.primaryButton}
                    disabled={
                      !isConnected ||
                      buyMutation.isPending ||
                      order.seller?.toLowerCase() === address?.toLowerCase()
                    }
                    onClick={() => handleBuy(order)}
                  >
                    {buyMutation.isPending
                      ? '提交交易中…'
                      : !isConnected
                      ? '连接钱包'
                      : '立即购买'}
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

function shortAddress(value?: string | null) {
  if (!value) return '-';
  if (value.length <= 10) return value;
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export default Home;
