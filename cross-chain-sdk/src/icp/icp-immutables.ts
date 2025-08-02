import { ICPAddressClass } from './icp-address'
import { ICPTimelocks } from './icp-timelocks'

export interface ICPImmutablesData {
    orderHash: string
    hashlock: string
    maker: string // EVM address
    taker: string // EVM address
    token: string // ICRC-1 ledger canister ID
    amount: bigint
    safetyDeposit: bigint
    timelocks: ICPTimelocks
    salt?: string
    chainId?: number
}

export class ICPImmutables {
    public readonly orderHash: string
    public readonly hashlock: string
    public readonly maker: string
    public readonly taker: string
    public readonly token: string
    public readonly amount: bigint
    public readonly safetyDeposit: bigint
    public readonly timelocks: ICPTimelocks
    public readonly salt: string
    public readonly chainId: number

    constructor(data: ICPImmutablesData) {
        this.orderHash = data.orderHash
        this.hashlock = data.hashlock
        this.maker = data.maker
        this.taker = data.taker
        this.token = data.token
        this.amount = data.amount
        this.safetyDeposit = data.safetyDeposit
        this.timelocks = data.timelocks
        this.salt = data.salt || '0'
        this.chainId = data.chainId || 1000 // Default to ICP mainnet
    }

    /**
     * Create ICP immutables from EVM immutables for cross-chain compatibility
     */
    public static fromEVMImmutables(evmImmutables: any, icpToken: string): ICPImmutables {
        return new ICPImmutables({
            orderHash: evmImmutables.orderHash,
            hashlock: evmImmutables.hashlock,
            maker: evmImmutables.maker,
            taker: evmImmutables.taker,
            token: icpToken, // Convert EVM token to ICP token
            amount: evmImmutables.amount,
            safetyDeposit: evmImmutables.safetyDeposit,
            timelocks: ICPTimelocks.fromEVMTimelocks(evmImmutables.timelocks),
            salt: evmImmutables.salt,
            chainId: 1000 // ICP mainnet
        })
    }

    /**
     * Convert to EVM-compatible format for cross-chain operations
     */
    public toEVMFormat(): any {
        return {
            orderHash: this.orderHash,
            hashlock: this.hashlock,
            maker: this.maker,
            taker: this.taker,
            token: this.token, // This would need to be mapped to EVM token
            amount: this.amount,
            safetyDeposit: this.safetyDeposit,
            timelocks: this.timelocks.toEVMFormat(),
            salt: this.salt,
            chainId: this.chainId
        }
    }

    /**
     * Validate immutables data
     */
    public validate(): { isValid: boolean; errors: string[] } {
        const errors: string[] = []

        // Validate order hash
        if (!this.orderHash || this.orderHash.length !== 66) { // 0x + 64 hex chars
            errors.push('Invalid order hash format')
        }

        // Validate hashlock
        if (!this.hashlock || this.hashlock.length !== 66) {
            errors.push('Invalid hashlock format')
        }

        // Validate maker address (EVM format)
        if (!this.maker || !this.maker.startsWith('0x') || this.maker.length !== 42) {
            errors.push('Invalid maker address format')
        }

        // Validate taker address (EVM format)
        if (!this.taker || !this.taker.startsWith('0x') || this.taker.length !== 42) {
            errors.push('Invalid taker address format')
        }

        // Validate token (ICP canister ID format)
        if (!this.token || !this.isValidCanisterId(this.token)) {
            errors.push('Invalid token canister ID format')
        }

        // Validate amounts
        if (this.amount <= 0n) {
            errors.push('Amount must be greater than 0')
        }

        if (this.safetyDeposit < 0n) {
            errors.push('Safety deposit cannot be negative')
        }

        // Validate timelocks
        const timelockValidation = this.timelocks.validate()
        if (!timelockValidation.isValid) {
            errors.push(...timelockValidation.errors)
        }

        return {
            isValid: errors.length === 0,
            errors
        }
    }

    /**
     * Get a unique identifier for this escrow
     */
    public getEscrowId(): string {
        return `${this.orderHash}-${this.salt}`
    }

    /**
     * Check if this escrow is for a specific chain
     */
    public isForChain(chainId: number): boolean {
        return this.chainId === chainId
    }

    /**
     * Check if this escrow is for ICP
     */
    public isForICP(): boolean {
        return this.chainId === 1000 || this.chainId === 1001 // ICP mainnet or testnet
    }

    /**
     * Get the escrow parameters as a plain object
     */
    public toObject(): ICPImmutablesData {
        return {
            orderHash: this.orderHash,
            hashlock: this.hashlock,
            maker: this.maker,
            taker: this.taker,
            token: this.token,
            amount: this.amount,
            safetyDeposit: this.safetyDeposit,
            timelocks: this.timelocks,
            salt: this.salt,
            chainId: this.chainId
        }
    }

    /**
     * Create a copy with modified parameters
     */
    public clone(updates: Partial<ICPImmutablesData>): ICPImmutables {
        return new ICPImmutables({
            ...this.toObject(),
            ...updates
        })
    }

    /**
     * Validate ICP canister ID format
     */
    private isValidCanisterId(canisterId: string): boolean {
        // ICP canister ID format: base32 with hyphens, ending in -cai
        const canisterIdRegex = /^[a-z0-9-]+-cai$/
        return canisterIdRegex.test(canisterId)
    }
}

export default ICPImmutables 