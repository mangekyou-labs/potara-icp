import {NetworkEnum} from '@1inch/fusion-sdk'
import {TupleToUnion} from './type-utils'
import {ICP_CHAIN_IDS, ICPChainId} from './icp/types'

// Extended chain enum to include ICP
export const ExtendedNetworkEnum = {
    ...NetworkEnum,
    INTERNET_COMPUTER: ICP_CHAIN_IDS.MAINNET,
    INTERNET_COMPUTER_TESTNET: ICP_CHAIN_IDS.TESTNET
} as const

export const SupportedChains = [
    NetworkEnum.ETHEREUM,
    NetworkEnum.POLYGON,
    NetworkEnum.BINANCE,
    NetworkEnum.OPTIMISM,
    NetworkEnum.ARBITRUM,
    NetworkEnum.AVALANCHE,
    NetworkEnum.GNOSIS,
    NetworkEnum.COINBASE,
    NetworkEnum.ZKSYNC,
    NetworkEnum.LINEA,
    NetworkEnum.SONIC,
    NetworkEnum.UNICHAIN,
    // Add ICP support
    ExtendedNetworkEnum.INTERNET_COMPUTER,
    ExtendedNetworkEnum.INTERNET_COMPUTER_TESTNET
] as const

type UnsupportedChain = Exclude<
    typeof ExtendedNetworkEnum,
    TupleToUnion<typeof SupportedChains>
>

export type SupportedChain = Exclude<typeof ExtendedNetworkEnum, UnsupportedChain>

export const isSupportedChain = (chain: unknown): chain is SupportedChain =>
    SupportedChains.includes(chain as number)

/**
 * Check if a chain is an ICP chain
 */
export const isICPChain = (chain: number): boolean => {
    return chain === ICP_CHAIN_IDS.MAINNET || chain === ICP_CHAIN_IDS.TESTNET
}

/**
 * Check if a chain is an EVM chain
 */
export const isEVMChain = (chain: number): boolean => {
    return !isICPChain(chain)
}

/**
 * Get chain configuration
 */
export const getChainConfig = (chainId: number) => {
    if (isICPChain(chainId)) {
        return {
            chainId,
            name: chainId === ICP_CHAIN_IDS.MAINNET ? 'Internet Computer' : 'Internet Computer Testnet',
            isTestnet: chainId === ICP_CHAIN_IDS.TESTNET,
            type: 'icp' as const
        }
    } else {
        return {
            chainId,
            name: getEVMChainName(chainId),
            isTestnet: isEVMTestnet(chainId),
            type: 'evm' as const
        }
    }
}

/**
 * Get EVM chain name
 */
const getEVMChainName = (chainId: number): string => {
    const chainNames: Record<number, string> = {
        [NetworkEnum.ETHEREUM]: 'Ethereum',
        [NetworkEnum.POLYGON]: 'Polygon',
        [NetworkEnum.BINANCE]: 'Binance Smart Chain',
        [NetworkEnum.OPTIMISM]: 'Optimism',
        [NetworkEnum.ARBITRUM]: 'Arbitrum',
        [NetworkEnum.AVALANCHE]: 'Avalanche',
        [NetworkEnum.GNOSIS]: 'Gnosis',
        [NetworkEnum.COINBASE]: 'Base',
        [NetworkEnum.ZKSYNC]: 'zkSync',
        [NetworkEnum.LINEA]: 'Linea',
        [NetworkEnum.SONIC]: 'Sonic',
        [NetworkEnum.UNICHAIN]: 'Unichain'
    }
    return chainNames[chainId] || `Chain ${chainId}`
}

/**
 * Check if EVM chain is testnet
 */
const isEVMTestnet = (chainId: number): boolean => {
    // Add testnet chain IDs as needed
    const testnetChainIds = [
        11155111, // Sepolia
        80001,    // Mumbai
        97,       // BSC Testnet
        420,      // Optimism Goerli
        421613,   // Arbitrum Goerli
        43113,    // Avalanche Fuji
        100,      // Gnosis Chiado
        84531,    // Base Goerli
        280,      // zkSync Goerli
        59140,    // Linea Goerli
    ]
    return testnetChainIds.includes(chainId)
}
