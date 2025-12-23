import Link from 'next/link';
import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';

import styles from '../styles/Home.module.css';

type NavKey = 'find' | 'create' | 'collections' | 'friends';

interface AppHeaderProps {
  active: NavKey;
}

export function AppHeader({ active }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open main menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className={styles.brand}>
          <span className={styles.brandMark} />
          <div>
            <div className={styles.brandTitle}>Charity NFT</div>
            <div className={styles.brandSubtitle}>BSC · Marketplace</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navLink}>
            <button
              type="button"
              className={`${styles.navItem} ${
                active === 'find' ? styles.navItemActive : ''
              }`}
            >
              Find a Cause
            </button>
          </Link>
          <Link href="/create-nft" className={styles.navLink}>
            <button
              type="button"
              className={`${styles.navItem} ${
                active === 'create' ? styles.navItemActive : ''
              }`}
            >
              Create NFT
            </button>
          </Link>
          <Link href="/nft-listing" className={styles.navLink}>
            <button
              type="button"
              className={`${styles.navItem} ${
                active === 'collections' ? styles.navItemActive : ''
              }`}
            >
              See Collections
            </button>
          </Link>
          <Link href="/my-orders" className={styles.navLink}>
            <button
              type="button"
              className={`${styles.navItem} ${
                active === 'friends' ? styles.navItemActive : ''
              }`}
            >
              Make Friends
            </button>
          </Link>
        </nav>
      </div>

      <div className={styles.headerCenter}>
        <div className={styles.searchPill}>
          <span className={styles.searchIcon}>
            <svg
              width="20"
              height="21"
              viewBox="0 0 20 21"
              aria-hidden="true"
            >
              <path
                d="M19 19.5L14.75 15.2425M17.1053 9.55263C17.1053 11.6883 16.2569 13.7365 14.7467 15.2467C13.2365 16.7569 11.1883 17.6053 9.05263 17.6053C6.91694 17.6053 4.86872 16.7569 3.35856 15.2467C1.8484 13.7365 1 11.6883 1 9.55263C1 7.41694 1.8484 5.36872 3.35856 3.85856C4.86872 2.3484 6.91694 1.5 9.05263 1.5C11.1883 1.5 13.2365 2.3484 14.7467 3.85856C16.2569 5.36872 17.1053 7.41694 17.1053 9.55263Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className={styles.searchLabel}>NFTs</span>
        </div>
      </div>

      <div className={styles.headerRight}>
        <div className={styles.walletButton}>
          <ConnectButton chainStatus="icon" showBalance={false} />
        </div>
      </div>
    </header>
  );
}
