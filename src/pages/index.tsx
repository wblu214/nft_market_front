import { useState, FormEvent, useMemo } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

import styles from '../styles/Home.module.css';
import type { Order, OrderStatus } from '../lib/api';
import {
  useCancelOrder,
  useCreateListing,
  useLockAndBuy,
  useOrders,
  useUploadImage,
} from '../lib/queries';
import { parseEther, formatEther } from 'viem';

type TabKey = 'explore' | 'sell' | 'my';

const DEFAULT_STATUS_FILTER: OrderStatus = 'LISTED';

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();

  const [activeTab, setActiveTab] = useState<TabKey>('explore');
  const [statusFilter, setStatusFilter] =
    useState<OrderStatus>(DEFAULT_STATUS_FILTER);

  const { data: orders, isLoading: ordersLoading, error: ordersError } =
    useOrders(statusFilter);

  const uploadMutation = useUploadImage();
  const createListingMutation = useCreateListing();
  const buyMutation = useLockAndBuy();
  const cancelMutation = useCancelOrder();

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [nftAddressInput, setNftAddressInput] = useState('');
  const [tokenIdInput, setTokenIdInput] = useState('');
  const [amountInput, setAmountInput] = useState('1');
  const [priceInput, setPriceInput] = useState('0.01');

  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const isCreatingListing =
    uploadMutation.isPending || createListingMutation.isPending;

  // 当前选中状态下的订单列表
  const filteredOrders = useMemo(() => orders ?? [], [orders]);

  const myOrders = useMemo(() => {
    if (!orders || !address) return [];
    return orders.filter(
      (o) =>
        o.seller?.toLowerCase() === address.toLowerCase() ||
        o.buyer?.toLowerCase() === address.toLowerCase(),
    );
  }, [orders, address]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setUploadedImageUrl(null);
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
  };

  const handleCreateListing = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!isConnected || !address) {
      setFormError('请先连接钱包（仅支持 BSC Mainnet / Testnet）。');
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
      // 如果有图片文件，先上传到 IPFS，得到 URL（用于你后续自行铸造 NFT）。
      if (imageFile && !uploadedImageUrl) {
        const res = await uploadMutation.mutateAsync(imageFile);
        setUploadedImageUrl(res.url);
      }

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

  const handleBuy = (order: Order) => {
    if (!isConnected || !address) {
      setFormError('请先连接钱包再进行购买。');
      return;
    }

    buyMutation.mutate({
      orderId: order.orderId,
      buyer: address,
    });
  };

  const handleCancel = (orderId: number) => {
    cancelMutation.mutate(orderId);
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
        <title>NFT Marketplace · BSC</title>
        <meta
          name="description"
          content="A clean and modern NFT marketplace front-end powered by BSC Mainnet & Testnet."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <div className={styles.brandTitle}>NFT Marketplace</div>
            <div className={styles.brandSubtitle}>BSC · Trading Module Demo</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <button
            type="button"
            className={`${styles.navItem} ${
              activeTab === 'explore' ? styles.navItemActive : ''
            }`}
            onClick={() => setActiveTab('explore')}
          >
            探索
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              activeTab === 'sell' ? styles.navItemActive : ''
            }`}
            onClick={() => setActiveTab('sell')}
          >
            上架出售
          </button>
          <button
            type="button"
            className={`${styles.navItem} ${
              activeTab === 'my' ? styles.navItemActive : ''
            }`}
            onClick={() => setActiveTab('my')}
          >
            我的订单
          </button>
        </nav>

        <div className={styles.headerRight}>
          <span className={styles.networkBadge}>BSC Mainnet / Testnet</span>
          <ConnectButton />
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.leftColumn}>
          {activeTab === 'explore' && (
            <div className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <div>
                  <h2 className={styles.sectionTitle}>市场挂单</h2>
                  <p className={styles.sectionSubtitle}>
                    浏览当前可购买的 NFT 挂单，链上结算由后端代为完成。
                  </p>
                </div>
                <div className={styles.filters}>
                  <label className={styles.filterLabel}>
                    状态
                    <select
                      value={statusFilter}
                      className={styles.select}
                      onChange={(e) =>
                        setStatusFilter(e.target.value as OrderStatus)
                      }
                    >
                      <option value="LISTED">可购买</option>
                      <option value="SETTLING">结算中</option>
                      <option value="SUCCESS">已成交</option>
                      <option value="LOCKED">已锁定</option>
                      <option value="CANCELED">已取消</option>
                      <option value="FAILED">失败</option>
                    </select>
                  </label>
                </div>
              </div>

              {ordersLoading && (
                <div className={styles.placeholder}>加载订单中…</div>
              )}

              {ordersError && (
                <div className={styles.errorBox}>
                  加载失败，请确认后端
                  <code className={styles.inlineCode}>
                    {' '}
                    http://localhost:2025{' '}
                  </code>
                  是否已启动。
                </div>
              )}

              {!ordersLoading &&
                !ordersError &&
                filteredOrders.length === 0 && (
                <div className={styles.placeholder}>
                  暂无满足条件的挂单，尝试更换状态或先创建一个订单。
                </div>
              )}

              <div className={styles.orderGrid}>
                {filteredOrders.map((order) => (
                  <article key={order.orderId} className={styles.orderCard}>
                    <div className={styles.orderCardHeader}>
                      <div className={styles.orderTitle}>
                        #{order.orderId}{' '}
                        <span className={styles.orderToken}>
                          {order.tokenId}
                        </span>
                      </div>
                      {renderStatusTag(order.status)}
                    </div>

                    <div className={styles.orderMeta}>
                      <div>
                        <div className={styles.metaLabel}>合约地址</div>
                        <div className={styles.metaValue}>
                          {shortAddress(order.nftAddress)}
                        </div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>卖家</div>
                        <div className={styles.metaValue}>
                          {shortAddress(order.seller)}
                        </div>
                      </div>
                    </div>

                    <div className={styles.orderFooter}>
                      <div className={styles.priceBox}>
                        <div className={styles.priceLabel}>价格</div>
                        <div className={styles.priceValue}>
                          {formatPrice(order.price)}
                        </div>
                      </div>

                      {order.status === 'LISTED' ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          disabled={
                            !isConnected ||
                            buyMutation.isPending ||
                            order.seller?.toLowerCase() ===
                              address?.toLowerCase()
                          }
                          onClick={() => handleBuy(order)}
                        >
                          {buyMutation.isPending
                            ? '提交交易中…'
                            : !isConnected
                            ? '连接钱包'
                            : '立即购买'}
                        </button>
                      ) : (
                        <span className={styles.helperTextSmall}>
                          当前状态不可购买
                        </span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'my' && (
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

              {isConnected && ordersLoading && (
                <div className={styles.placeholder}>加载订单中…</div>
              )}

              {isConnected && ordersError && (
                <div className={styles.errorBox}>
                  加载失败，请确认后端服务已启动。
                </div>
              )}

              {isConnected &&
                !ordersLoading &&
                !ordersError &&
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
                          NFT: {shortAddress(order.nftAddress)} #
                          {order.tokenId}
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
          )}
        </section>

        <aside className={styles.rightColumn}>
          <div className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>创建并上架挂单</h2>
                <p className={styles.sectionSubtitle}>
                  上传 NFT 图片（走 IPFS）、在你自己的前端或服务中铸造 NFT，
                  然后使用已知的合约地址和 Token ID 在 BSC 上架到 Marketplace。
                </p>
              </div>
            </div>

            <form className={styles.form} onSubmit={handleCreateListing}>
              <div className={styles.formGroup}>
                <label className={styles.label}>
                  NFT 图片（可选，用于生成元数据）
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
                    <img src={imagePreview} alt="Preview" />
                  </div>
                )}

                {uploadedImageUrl && (
                  <div className={styles.helperText}>
                    已上传至 IPFS：{' '}
                    <a
                      href={uploadedImageUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      查看图片
                    </a>
                  </div>
                )}
              </div>

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
                disabled={isCreatingListing}
              >
                {isCreatingListing ? '创建挂单中…' : '一键上架到 Marketplace'}
              </button>

              {!isConnected && (
                <p className={styles.helperText}>
                  提示：创建挂单前，请先连接 BSC 钱包地址（后台会使用配置的钱包代为调用
                  list()）。
                </p>
              )}
            </form>
          </div>
        </aside>
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
