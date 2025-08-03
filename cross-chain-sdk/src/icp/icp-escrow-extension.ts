import {
    Address,
    Extension,
    FusionExtension,
    Interaction,
    SettlementPostInteractionData,
    AuctionDetails,
    ZX,
    now
} from '@1inch/fusion-sdk'
import {ExtendedNetworkEnum} from '../chains'
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

    constructor(
        address: Address,
        auctionDetails: AuctionDetails,
        postInteractionData: SettlementPostInteractionData,
        makerPermit: Interaction | undefined,
        hashLockInfo: HashLock,
        dstChainId: number,
        dstToken: Address,
        srcSafetyDeposit: bigint,
        dstSafetyDeposit: bigint,
        timeLocks: any, // Using any for now to avoid type conflicts
        icpParams: ICPEscrowParams
    ) {
        super(
            address,
            auctionDetails,
            postInteractionData,
            makerPermit,
            hashLockInfo,
            dstChainId,
            dstToken,
            srcSafetyDeposit,
            dstSafetyDeposit,
            timeLocks
        )
        this.icpParams = icpParams
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
        return this.dstChainId === ExtendedNetworkEnum.INTERNET_COMPUTER
    }

    /**
     * Check if this is an ICP source order
     */
    get isICPSource(): boolean {
        return this.dstChainId === ExtendedNetworkEnum.INTERNET_COMPUTER
    }

    /**
     * Get the destination token as ICP address
     */
    get dstTokenAsICP(): ICPAddress {
        if (this.isICPDestination) {
            // Convert EVM address to ICP address for destination
            return ICPAddress.fromEVMAddress(this.dstToken.toString())
        }
        throw new Error('Destination is not ICP')
    }

    /**
     * Get the source token as ICP address
     */
    get srcTokenAsICP(): ICPAddress {
        if (this.isICPSource) {
            // Convert EVM address to ICP address for source
            return ICPAddress.fromEVMAddress(this.dstToken.toString())
        }
        throw new Error('Source is not ICP')
    }

    /**
     * Convert to ICP extension format
     */
    public toICPExtension(): Extension {
        const baseExtension = super.build()
        
        const icpData = {
            icpCanisterId: this.icpParams.icpCanisterId,
            icpPrincipal: this.icpParams.icpPrincipal,
            icpTimeLocks: this.icpParams.timeLocks.toBytes(),
            isICPDestination: this.isICPDestination,
            isICPSource: this.isICPSource
        }

        return new Extension({
            ...baseExtension,
            data: ZX.concat([
                baseExtension.data,
                this.encodeICPData(icpData)
            ])
        })
    }

    /**
     * Create from ICP extension
     */
    public static fromICPExtension(extension: Extension): ICPEscrowExtension {
        const baseExtension = EscrowExtension.fromExtension(extension)
        const icpData = this.decodeICPData(extension.data)

        const baseParams = {
            hashLock: baseExtension.hashLockInfo,
            timeLocks: baseExtension.timeLocks,
            srcChainId: baseExtension.dstChainId, // Using dstChainId as src for now
            dstChainId: baseExtension.dstChainId,
            srcSafetyDeposit: baseExtension.srcSafetyDeposit,
            dstSafetyDeposit: baseExtension.dstSafetyDeposit
        }

        return new ICPEscrowExtension(
            baseExtension.address,
            baseExtension.auctionDetails,
            baseExtension.postInteractionData,
            baseExtension.makerPermit,
            baseExtension.hashLockInfo,
            baseExtension.dstChainId,
            baseExtension.dstToken,
            baseExtension.srcSafetyDeposit,
            baseExtension.dstSafetyDeposit,
            baseExtension.timeLocks,
            {
                ...baseParams,
                icpCanisterId: icpData.icpCanisterId,
                icpPrincipal: icpData.icpPrincipal
            }
        )
    }

    /**
     * Validate ICP-specific parameters
     */
    public validateICPParams(): void {
        // Validate ICP destination chain
        if (this.isICPDestination && this.dstChainId !== ExtendedNetworkEnum.INTERNET_COMPUTER) {
            throw new Error('Invalid ICP destination chain')
        }

        // Validate ICP source chain
        if (this.isICPSource && this.dstChainId !== ExtendedNetworkEnum.INTERNET_COMPUTER) {
            throw new Error('Invalid ICP source chain')
        }

        // Validate ICP canister ID if specified
        if (this.icpParams.icpCanisterId) {
            if (!ICPAddress.isValid(this.icpParams.icpCanisterId)) {
                throw new Error('Invalid ICP canister ID')
            }
        }

        // Validate ICP principal if specified
        if (this.icpParams.icpPrincipal) {
            if (!ICPAddress.isValid(this.icpParams.icpPrincipal)) {
                throw new Error('Invalid ICP principal')
            }
        }
    }

    /**
     * Convert to ICP escrow parameters
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
            orderHash: this.hashLockInfo.orderHash || '',
            hashlock: this.hashLockInfo.hashlock || new Uint8Array(),
            maker: this.address.toString(),
            taker: this.address.toString(), // Using same address for now
            amount: this.icpParams.timeLocks.amount || 0n,
            safetyDeposit: this.dstSafetyDeposit,
            timelocks: this.icpParams.timeLocks.toBytes(),
            tokenLedger: this.icpParams.icpCanisterId
        }
    }

    /**
     * Encode ICP-specific data
     */
    private encodeICPData(data: {
        icpCanisterId?: string
        icpPrincipal?: string
        icpTimeLocks: Uint8Array
        isICPDestination: boolean
        isICPSource: boolean
    }): string {
        const encoded = {
            icpCanisterId: data.icpCanisterId || '',
            icpPrincipal: data.icpPrincipal || '',
            icpTimeLocks: Array.from(data.icpTimeLocks),
            isICPDestination: data.isICPDestination,
            isICPSource: data.isICPSource
        }

        return ZX.encode(JSON.stringify(encoded))
    }

    /**
     * Decode ICP-specific data
     */
    private static decodeICPData(extensionData: string): {
        icpCanisterId?: string
        icpPrincipal?: string
        icpTimeLocks: Uint8Array
        isICPDestination: boolean
        isICPSource: boolean
    } {
        try {
            const decoded = ZX.decode(extensionData)
            const parsed = JSON.parse(decoded)
            
            return {
                icpCanisterId: parsed.icpCanisterId || undefined,
                icpPrincipal: parsed.icpPrincipal || undefined,
                icpTimeLocks: new Uint8Array(parsed.icpTimeLocks || []),
                isICPDestination: parsed.isICPDestination || false,
                isICPSource: parsed.isICPSource || false
            }
        } catch (error) {
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
        return this.forEVMToICP(srcChainId, hashLock, timeLocks)
    }

    /**
     * Create ICP escrow extension for EVM to ICP transfer
     */
    public static forEVMToICP(
        srcChainId: number,
        hashLock: HashLock,
        timeLocks: ICPTimelocks,
        icpCanisterId?: string,
        icpPrincipal?: string
    ): ICPEscrowExtension {
        const icpParams: ICPEscrowParams = {
            hashLock,
            timeLocks,
            srcChainId,
            dstChainId: ExtendedNetworkEnum.INTERNET_COMPUTER,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
            icpCanisterId,
            icpPrincipal
        }

        return new ICPEscrowExtension(
            Address.ZERO,
            {} as AuctionDetails,
            {} as SettlementPostInteractionData,
            undefined,
            hashLock,
            ExtendedNetworkEnum.INTERNET_COMPUTER,
            Address.ZERO,
            0n,
            0n,
            timeLocks,
            icpParams
        )
    }

    /**
     * Create ICP escrow extension for ICP to EVM transfer
     */
    public static forICPToEVM(
        dstChainId: number,
        hashLock: HashLock,
        timeLocks: ICPTimelocks,
        icpCanisterId?: string,
        icpPrincipal?: string
    ): ICPEscrowExtension {
        const icpParams: ICPEscrowParams = {
            hashLock,
            timeLocks,
            srcChainId: ExtendedNetworkEnum.INTERNET_COMPUTER,
            dstChainId,
            srcSafetyDeposit: 0n,
            dstSafetyDeposit: 0n,
            icpCanisterId,
            icpPrincipal
        }

        return new ICPEscrowExtension(
            Address.ZERO,
            {} as AuctionDetails,
            {} as SettlementPostInteractionData,
            undefined,
            hashLock,
            dstChainId,
            Address.ZERO,
            0n,
            0n,
            timeLocks,
            icpParams
        )
    }
} 