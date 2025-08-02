import {Address} from '@1inch/fusion-sdk'
import {ICPAddress} from './icp-address'
import {ICPTimelocks} from './icp-timelocks'
import {HashLock} from '../cross-chain-order/hash-lock'

/**
 * ICP-specific cross-chain order information
 * Extends the base order info with ICP-specific parameters
 */
export interface ICPCrossChainOrderInfo {
    /** Unique salt for order identification */
    salt: bigint
    /** Order maker (user creating the order) */
    maker: Address
    /** Amount being offered by maker */
    makingAmount: bigint
    /** Amount being requested by maker */
    takingAmount: bigint
    /** Asset being offered (EVM token address) */
    makerAsset: Address
    /** Asset being requested (ICP token principal) */
    takerAsset: ICPAddress
    /** Recipient of the order (if different from maker) */
    receiver?: Address
    /** Order deadline timestamp */
    deadline: bigint
    /** Auction start time */
    auctionStartTime: bigint
    /** Auction end time */
    auctionEndTime: bigint
    /** Order nonce for uniqueness */
    nonce: bigint
    /** Whether partial fills are allowed */
    partialFillAllowed: boolean
    /** Whether multiple fills are allowed */
    multipleFillsAllowed: boolean
}

/**
 * ICP-specific escrow parameters
 * Defines the escrow configuration for ICP destinations
 */
export interface ICPEscrowParams {
    /** Hashlock for atomic swap security */
    hashLock: HashLock
    /** Timelock configuration for ICP escrow */
    timeLocks: ICPTimelocks
    /** Source chain ID (EVM chain) */
    srcChainId: number
    /** Destination chain ID (ICP) */
    dstChainId: number
    /** Safety deposit for source chain */
    srcSafetyDeposit: bigint
    /** Safety deposit for destination chain (ICP cycles) */
    dstSafetyDeposit: bigint
    /** ICP canister ID for escrow deployment */
    icpCanisterId?: string
    /** ICP principal for token transfers */
    icpPrincipal?: string
}

/**
 * ICP-specific order details
 * Additional parameters for ICP order execution
 */
export interface ICPDetails {
    /** Auction configuration */
    auction: {
        /** Starting price */
        startPrice: bigint
        /** Ending price */
        endPrice: bigint
        /** Auction duration */
        duration: bigint
    }
    /** Whitelist of allowed resolvers */
    whitelist: Array<{
        /** Resolver address */
        address: Address
        /** Allow from timestamp */
        allowFrom: bigint
    }>
    /** Resolving start time */
    resolvingStartTime: bigint
    /** ICP-specific configuration */
    icp: {
        /** ICP canister deployment parameters */
        canisterDeployment: {
            /** Memory allocation in pages */
            memoryAllocation: bigint
            /** Compute allocation in cycles */
            computeAllocation: bigint
        }
        /** Token transfer configuration */
        tokenTransfer: {
            /** ICRC-1 ledger canister ID */
            ledgerCanisterId: string
            /** Token decimals */
            decimals: number
        }
    }
}

/**
 * ICP-specific extra parameters
 * Additional configuration for ICP orders
 */
export interface ICPExtra {
    /** ICP-specific metadata */
    icpMetadata?: {
        /** Canister name */
        name: string
        /** Canister description */
        description: string
        /** Custom canister parameters */
        customParams?: Record<string, any>
    }
    /** Cross-chain communication settings */
    crossChainSettings?: {
        /** EVM RPC canister ID */
        evmRpcCanisterId: string
        /** Threshold ECDSA canister ID */
        thresholdEcdsaCanisterId: string
        /** Monitoring interval in seconds */
        monitoringInterval: number
    }
}

/**
 * Simplified parameters for ICP order creation
 * Combines all necessary parameters for easy order creation
 */
export interface ICPOrderCreationParams {
    /** Order information */
    orderInfo: ICPCrossChainOrderInfo
    /** Escrow parameters */
    escrowParams: ICPEscrowParams
    /** Order details */
    details: ICPDetails
    /** Extra parameters */
    extra?: ICPExtra
}

/**
 * ICP order execution result
 * Result of order execution on ICP
 */
export interface ICPOrderExecutionResult {
    /** Order hash */
    orderHash: string
    /** ICP escrow canister ID */
    icpEscrowCanisterId: string
    /** EVM escrow address */
    evmEscrowAddress: string
    /** Execution status */
    status: 'pending' | 'executed' | 'cancelled' | 'failed'
    /** Execution timestamp */
    executedAt?: bigint
    /** Error message if failed */
    error?: string
    /** Transaction details */
    transactions: {
        /** EVM transaction hash */
        evmTxHash?: string
        /** ICP update call ID */
        icpCallId?: string
    }
}

/**
 * ICP order validation result
 * Result of order validation
 */
export interface ICPOrderValidationResult {
    /** Whether order is valid */
    isValid: boolean
    /** Validation errors */
    errors: string[]
    /** Validation warnings */
    warnings: string[]
    /** Order hash */
    orderHash: string
}

/**
 * ICP order state
 * Current state of an ICP order
 */
export interface ICPOrderState {
    /** Order hash */
    orderHash: string
    /** Current state */
    state: 'created' | 'deployed' | 'executed' | 'cancelled' | 'expired'
    /** Creation timestamp */
    createdAt: bigint
    /** Last update timestamp */
    updatedAt: bigint
    /** ICP escrow canister ID */
    icpEscrowCanisterId?: string
    /** EVM escrow address */
    evmEscrowAddress?: string
    /** Execution timestamp */
    executedAt?: bigint
    /** Cancellation timestamp */
    cancelledAt?: bigint
    /** Expiration timestamp */
    expiredAt?: bigint
} 