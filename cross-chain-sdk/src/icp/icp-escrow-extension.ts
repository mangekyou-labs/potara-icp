import {
    Address,
    Extension,
    NetworkEnum,
    ZX,
    now
} from '@1inch/fusion-sdk'
import {EscrowExtension} from '../cross-chain-order/escrow-extension'
import {HashLock} from '../cross-chain-order/hash-lock'
import {ICPTimelocks} from './icp-timelocks'
import {ICPAddress} from './icp-address'
import {ICPEscrowParams} from './icp-order-types'

/**
 * ICP-specific escrow extension
 * Extends the base EscrowExtension to support ICP destinations and sources
 */
export class ICPEscrowExtension extends EscrowExtension {
    private readonly icpParams: ICPEscrowParams

    constructor(params: ICPEscrowParams) {
        // Create base extension with EVM-compatible parameters
        const baseParams = {
            hashLock: params.hashLock,
            timeLocks: params.timeLocks.toEVMFormat(),
            srcChainId: params.srcChainId,
            dstChainId: params.dstChainId,
            srcSafetyDeposit: params.srcSafetyDeposit,
            dstSafetyDeposit: params.dstSafetyDeposit
        }
        
        super(baseParams)
        this.icpParams = params
    }

    /**
     * Get ICP-specific parameters
     */
    get icpEscrowParams(): ICPEscrowParams {
        return this.icpParams
    }

    /**
     * Get ICP canister ID if specified
     */
    get icpCanisterId(): string | undefined {
        return this.icpParams.icpCanisterId
    }

    /**
     * Get ICP principal if specified
     */
    get icpPrincipal(): string | undefined {
        return this.icpParams.icpPrincipal
    }

    /**
     * Get ICP timelocks
     */
    get icpTimeLocks(): ICPTimelocks {
        return this.icpParams.timeLocks
    }

    /**
     * Check if this is an ICP destination order
     */
    get isICPDestination(): boolean {
        return this.dstChainId === NetworkEnum.INTERNET_COMPUTER
    }

    /**
     * Check if this is an ICP source order
     */
    get isICPSource(): boolean {
        return this.srcChainId === NetworkEnum.INTERNET_COMPUTER
    }

    /**
     * Get the destination token as ICP address
     */
    get dstTokenAsICP(): ICPAddress {
        if (this.isICPDestination) {
            // Convert EVM address to ICP address for destination
            return ICPAddress.fromEVMAddress(this.dstToken)
        }
        throw new Error('Destination is not ICP')
    }

    /**
     * Get the source token as ICP address
     */
    get srcTokenAsICP(): ICPAddress {
        if (this.isICPSource) {
            // Convert EVM address to ICP address for source
            return ICPAddress.fromEVMAddress(this.srcToken)
        }
        throw new Error('Source is not ICP')
    }

    /**
     * Create ICP-specific extension data
     */
    public toICPExtension(): Extension {
        const baseExtension = this.toExtension()
        
        // Add ICP-specific data to the extension
        const icpData = {
            icpCanisterId: this.icpCanisterId,
            icpPrincipal: this.icpPrincipal,
            icpTimeLocks: this.icpTimeLocks.toBytes(),
            isICPDestination: this.isICPDestination,
            isICPSource: this.isICPSource
        }

        return {
            ...baseExtension,
            data: ZX.concat([
                baseExtension.data,
                this.encodeICPData(icpData)
            ])
        }
    }

    /**
     * Create from ICP extension data
     */
    public static fromICPExtension(extension: Extension): ICPEscrowExtension {
        const baseParams = EscrowExtension.fromExtension(extension)
        
        // Extract ICP-specific data
        const icpData = this.decodeICPData(extension.data)
        
        const icpParams: ICPEscrowParams = {
            hashLock: baseParams.hashLock,
            timeLocks: ICPTimelocks.fromBytes(icpData.icpTimeLocks),
            srcChainId: baseParams.srcChainId,
            dstChainId: baseParams.dstChainId,
            srcSafetyDeposit: baseParams.srcSafetyDeposit,
            dstSafetyDeposit: baseParams.dstSafetyDeposit,
            icpCanisterId: icpData.icpCanisterId,
            icpPrincipal: icpData.icpPrincipal
        }

        return new ICPEscrowExtension(icpParams)
    }

    /**
     * Validate ICP-specific parameters
     */
    public validateICPParams(): void {
        // Validate chain IDs
        if (this.isICPDestination && this.dstChainId !== NetworkEnum.INTERNET_COMPUTER) {
            throw new Error('Invalid destination chain for ICP order')
        }
        
        if (this.isICPSource && this.srcChainId !== NetworkEnum.INTERNET_COMPUTER) {
            throw new Error('Invalid source chain for ICP order')
        }

        // Validate ICP addresses
        if (this.isICPDestination) {
            try {
                this.dstTokenAsICP
            } catch (error) {
                throw new Error('Invalid ICP destination token address')
            }
        }

        if (this.isICPSource) {
            try {
                this.srcTokenAsICP
            } catch (error) {
                throw new Error('Invalid ICP source token address')
            }
        }

        // Validate timelocks
        this.icpTimeLocks.validate()

        // Validate safety deposits
        if (this.dstSafetyDeposit < 0n) {
            throw new Error('Invalid ICP safety deposit')
        }
    }

    /**
     * Create ICP escrow parameters for deployment
     */
    public toICPEscrowParams(): {
        orderHash: string
        hashlock: Uint8Array
        maker: string
        taker: string
        amount: bigint
        safetyDeposit: bigint
        timelocks: Uint8Array
        tokenLedger?: string
    } {
        return {
            orderHash: this.hashLockInfo.orderHash,
            hashlock: this.hashLockInfo.hashlock,
            maker: this.maker.toString(),
            taker: this.taker.toString(),
            amount: this.amount,
            safetyDeposit: this.dstSafetyDeposit,
            timelocks: this.icpTimeLocks.toBytes(),
            tokenLedger: this.icpCanisterId
        }
    }

    /**
     * Encode ICP-specific data for extension
     */
    private encodeICPData(data: {
        icpCanisterId?: string
        icpPrincipal?: string
        icpTimeLocks: Uint8Array
        isICPDestination: boolean
        isICPSource: boolean
    }): string {
        // Simple encoding for ICP data
        const encoded = {
            icp: {
                canisterId: data.icpCanisterId || '',
                principal: data.icpPrincipal || '',
                timeLocks: Array.from(data.icpTimeLocks),
                isDestination: data.isICPDestination,
                isSource: data.isICPSource
            }
        }
        
        return ZX.encode(JSON.stringify(encoded))
    }

    /**
     * Decode ICP-specific data from extension
     */
    private static decodeICPData(extensionData: string): {
        icpCanisterId?: string
        icpPrincipal?: string
        icpTimeLocks: Uint8Array
        isICPDestination: boolean
        isICPSource: boolean
    } {
        try {
            // Extract ICP data from extension
            const decoded = ZX.decode(extensionData)
            const icpData = JSON.parse(decoded).icp
            
            return {
                icpCanisterId: icpData.canisterId || undefined,
                icpPrincipal: icpData.principal || undefined,
                icpTimeLocks: new Uint8Array(icpData.timeLocks),
                isICPDestination: icpData.isDestination,
                isICPSource: icpData.isSource
            }
        } catch (error) {
            // Return default values if decoding fails
            return {
                icpCanisterId: undefined,
                icpPrincipal: undefined,
                icpTimeLocks: new Uint8Array(),
                isICPDestination: false,
                isICPSource: false
            }
        }
    }

    /**
     * Create default ICP escrow extension
     */
    public static createDefault(
        srcChainId: number,
        dstChainId: number,
        hashLock: HashLock,
        timeLocks: ICPTimelocks
    ): ICPEscrowExtension {
        const params: ICPEscrowParams = {
            hashLock,
            timeLocks,
            srcChainId,
            dstChainId,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n
        }

        return new ICPEscrowExtension(params)
    }

    /**
     * Create ICP escrow extension for EVM→ICP order
     */
    public static forEVMToICP(
        srcChainId: number,
        hashLock: HashLock,
        timeLocks: ICPTimelocks,
        icpCanisterId?: string,
        icpPrincipal?: string
    ): ICPEscrowExtension {
        const params: ICPEscrowParams = {
            hashLock,
            timeLocks,
            srcChainId,
            dstChainId: NetworkEnum.INTERNET_COMPUTER,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
            icpCanisterId,
            icpPrincipal
        }

        return new ICPEscrowExtension(params)
    }

    /**
     * Create ICP escrow extension for ICP→EVM order
     */
    public static forICPToEVM(
        dstChainId: number,
        hashLock: HashLock,
        timeLocks: ICPTimelocks,
        icpCanisterId?: string,
        icpPrincipal?: string
    ): ICPEscrowExtension {
        const params: ICPEscrowParams = {
            hashLock,
            timeLocks,
            srcChainId: NetworkEnum.INTERNET_COMPUTER,
            dstChainId,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
            icpCanisterId,
            icpPrincipal
        }

        return new ICPEscrowExtension(params)
    }
} 