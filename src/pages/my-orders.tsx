import type { NextPage } from 'next';
import Head from 'next/head';
import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { formatEther } from 'viem';

import styles from '../styles/Home.module.css';
import type { Order, OrderStatus } from '../lib/api';
import { useCancelOrder, useOrders } from '../lib/queries';
import { AppHeader } from '../components/AppHeader';

const MyOrdersPage: NextPage = () => {
  const { address, isConnected } = useAccount();
  const { data: orders, isLoading, error } = useOrders();
  const cancelMutation = useCancelOrder();

  const myOrders = useMemo(() => {
    if (!orders || !address) return [];
    return orders.filter(
      (o) =>
        o.seller?.toLowerCase() === address.toLowerCase() ||
        o.buyer?.toLowerCase() === address.toLowerCase(),
    );
  }, [orders, address]);

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

  const handleCancel = (orderId: number) => {
    cancelMutation.mutate(orderId);
  };

  return (
    <div className={styles.page}>
      <Head>
        <title>My Orders · Charity NFT</title>
      </Head>

      <AppHeader active="orders" />

      <main className={styles.main}>
        <section className={styles.leftColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>我的订单</h2>
                <p className={styles.sectionSubtitle}>
                  查看你作为卖家和买家的所有订单状态。
                </p>
              </div>
            </div>

            {!isConnected && (
              <div className={styles.placeholder}>
                请先连接钱包后查看「我的订单」。
              </div>
            )}

            {isConnected && isLoading && (
              <div className={styles.placeholder}>加载订单中…</div>
            )}

            {isConnected && error && (
              <div className={styles.errorBox}>
                加载失败，请确认后端服务已启动。
              </div>
            )}

            {isConnected &&
              !isLoading &&
              !error &&
              myOrders.length === 0 && (
                <div className={styles.placeholder}>
                  当前钱包地址还没有相关订单。
                </div>
              )}

            <div className={styles.orderList}>
              {myOrders.map((order) => (
                <article key={order.orderId} className={styles.orderRow}>
                  <div className={styles.orderRowMain}>
                    <div className={styles.orderRowTitle}>
                      <span>订单 #{order.orderId}</span>
                      {renderStatusTag(order.status)}
                    </div>
                    <div className={styles.orderRowMeta}>
                      <span>
                        NFT: {shortAddress(order.nftAddress)} #{order.tokenId}
                      </span>
                      <span>价格: {formatPrice(order.price)}</span>
                      <span>
                        角色:{' '}
                        {order.seller?.toLowerCase() ===
                        address?.toLowerCase()
                          ? '卖家'
                          : '买家'}
                      </span>
                    </div>
                  </div>
                  <div className={styles.orderRowActions}>
                    {order.status === 'LISTED' &&
                      order.seller?.toLowerCase() ===
                        address?.toLowerCase() && (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          disabled={cancelMutation.isPending}
                          onClick={() => handleCancel(order.orderId)}
                        >
                          {cancelMutation.isPending ? '取消中…' : '取消挂单'}
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
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

export default MyOrdersPage;
