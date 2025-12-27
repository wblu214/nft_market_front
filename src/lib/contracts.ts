import nftMarketplaceAbiJson from '../../docs/NFTMarketplace.abi.json';
import projectNftAbiJson from '../../docs/ProjectNFT.abi.json';
import project1155AbiJson from '../../docs/Project1155.abi.json';

// BSC Testnet chain id
export const BSC_TESTNET_CHAIN_ID = 97;

// 合約地址，來自 Backend_API_Doc.md
export const NFT_MARKETPLACE_ADDRESS =
  '0xCAD727e729e6737405773B05D2dac105a3026764';

export const PROJECT_NFT_ADDRESS =
  '0xaa6a15D595bA8F69680465FBE61d9d886057Cb1E';

export const PROJECT_1155_ADDRESS =
  '0x1fF53616471271d80E17BD2A46C863d3Fd38aE81';

// 這裡不強依賴 viem 的 Abi 類型，直接用 any 以避免類型兼容問題。
export const nftMarketplaceAbi = nftMarketplaceAbiJson as any;
export const projectNftAbi = projectNftAbiJson as any;
export const project1155Abi = project1155AbiJson as any;

