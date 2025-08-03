import {Address} from '@1inch/fusion-sdk'

/**
 * ICP Chain IDs
 * Note: Using different IDs to avoid conflicts with EVM chains
 */
export const ICP_CHAIN_IDS = {
    MAINNET: 1000, // Using 1000 to avoid conflicts with EVM chains
    TESTNET: 1001  // Using 1001 for testnet
} as const

export type ICPChainId = typeof ICP_CHAIN_IDS[keyof typeof ICP_CHAIN_IDS]

/**
 * ICP Principal ID (base32 encoded)
 */
export type ICPPrincipal = string

/**
 * ICP Canister ID (base32 encoded)
 */
export type ICPCanister = string

/**
 * ICP Address can be either a Principal or Canister ID
 * Note: This is now handled by the ICPAddress class
 */
export type ICPAddressType = ICPPrincipal | ICPCanister

/**
 * ICP-specific chain configuration
 */
export interface ICPChainConfig {
    chainId: ICPChainId
    name: string
    rpcUrl?: string
    canisterId?: string
    isTestnet: boolean
}

/**
 * ICP-specific escrow parameters
 */
export interface ICPEscrowParams {
    principal: ICPPrincipal
    canisterId: ICPCanister
    cycles: bigint
    hashlock: string
    timelock: bigint
    amount: bigint
    token: string
}

/**
 * ICP address validation result
 */
export interface ICPAddressValidation {
    isValid: boolean
    type: 'principal' | 'canister' | 'invalid'
    address: string
    error?: string
}

/**
 * Cross-chain address mapping
 */
export interface CrossChainAddressMapping {
    evmAddress: string
    icpPrincipal: ICPPrincipal
    chainId: number
}

/**
 * ICP transaction result
 */
export interface ICPTransactionResult {
    success: boolean
    transactionId?: string
    error?: string
    cyclesUsed?: bigint
}

/**
 * ICP canister call parameters
 */
export interface ICPCanisterCall {
    canisterId: ICPCanister
    method: string
    args: any[]
    cycles?: bigint
} 