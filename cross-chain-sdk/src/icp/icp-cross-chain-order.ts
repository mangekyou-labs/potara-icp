import {
    Address,
    OrderInfoData,
    AuctionCalculator,
    Extension,
    LimitOrderV4Struct,
    EIP712TypedData,
    Interaction,
    MakerTraits,
    ZX,
    SettlementPostInteractionData,
    now,
    NetworkEnum
} from '@1inch/fusion-sdk'
import assert from 'assert'
import {CrossChainOrderInfo, Details, EscrowParams, Extra} from '../cross-chain-order/types'
import {InnerOrder} from '../cross-chain-order/inner-order'
import {EscrowExtension} from '../cross-chain-order/escrow-extension'
import {TRUE_ERC20} from '../deployments'
import {isSupportedChain, SupportedChain} from '../chains'
import {Immutables} from '../immutables'
import {ICPEscrowExtension} from './icp-escrow-extension'
import {ICPCrossChainOrderInfo, ICPDetails, ICPEscrowParams, ICPExtra, ICPOrderCreationParams} from './icp-order-types'
import {ICPAddress} from './icp-address'
import {ICPTimelocks} from './icp-timelocks'
import {ICPImmutables} from './icp-immutables'
import {HashLock} from '../cross-chain-order/hash-lock'

/**
 * ICP-specific cross-chain order implementation
 * Extends CrossChainOrder to support ICP destinations and sources
 */
export class ICPCrossChainOrder {
    private inner: InnerOrder
    private icpExtension: ICPEscrowExtension

    private constructor(
        extension: ICPEscrowExtension,
        orderInfo: OrderInfoData,
        extra?: Extra
    ) {
        this.inner = new InnerOrder(extension, orderInfo, extra)
        this.icpExtension = extension
    }

    get dstChainId(): NetworkEnum {
        return this.inner.escrowExtension.dstChainId
    }

    get escrowExtension(): ICPEscrowExtension {
        return this.icpExtension
    }

    get extension(): Extension {
        return this.inner.extension
    }

    get maker(): Address {
        return this.inner.maker
    }

    get takerAsset(): Address {
        return this.inner.escrowExtension.dstToken
    }

    get makerAsset(): Address {
        return this.inner.makerAsset
    }

    get takingAmount(): bigint {
        return this.inner.takingAmount
    }

    get makingAmount(): bigint {
        return this.inner.makingAmount
    }

    get salt(): bigint {
        return this.inner.salt
    }

    /**
     * If zero address, then maker will receive funds
     */
    get receiver(): Address {
        return this.inner.receiver
    }

    /**
     * Timestamp in sec
     */
    get deadline(): bigint {
        return this.inner.deadline
    }

    /**
     * Timestamp in sec
     */
    get auctionStartTime(): bigint {
        return this.inner.auctionStartTime
    }

    /**
     * Timestamp in sec
     */
    get auctionEndTime(): bigint {
        return this.inner.auctionEndTime
    }

    get nonce(): bigint {
        return this.inner.nonce
    }

    get partialFillAllowed(): boolean {
        return this.inner.partialFillAllowed
    }

    get multipleFillsAllowed(): boolean {
        return this.inner.multipleFillsAllowed
    }

    /**
     * Create new ICP cross-chain order
     */
    public static new(
        escrowFactory: Address,
        orderInfo: ICPCrossChainOrderInfo,
        escrowParams: ICPEscrowParams,
        details: ICPDetails,
        extra?: ICPExtra
    ): ICPCrossChainOrder {
        // Validate ICP-specific parameters
        ICPCrossChainOrder.validateICPOrderInfo(orderInfo)
        ICPCrossChainOrder.validateICPEscrowParams(escrowParams)
        ICPCrossChainOrder.validateICPDetails(details)

        // Convert ICP addresses to EVM addresses for compatibility
        const evmOrderInfo: CrossChainOrderInfo = {
            makerAsset: orderInfo.makerAsset,
            takerAsset: orderInfo.takerAsset.toEVMAddress(),
            makingAmount: orderInfo.makingAmount,
            takingAmount: orderInfo.takingAmount,
            maker: orderInfo.maker,
            salt: orderInfo.salt,
            receiver: orderInfo.receiver?.toEVMAddress()
        }

        const evmEscrowParams: EscrowParams = {
            hashLock: escrowParams.hashLock,
            srcChainId: escrowParams.srcChainId,
            dstChainId: escrowParams.dstChainId,
            srcSafetyDeposit: escrowParams.srcSafetyDeposit,
            dstSafetyDeposit: escrowParams.dstSafetyDeposit,
            timeLocks: escrowParams.timeLocks.toEVMTimelocks()
        }

        const evmDetails: Details = {
            auction: details.auction,
            fees: details.fees,
            whitelist: details.whitelist,
            resolvingStartTime: details.resolvingStartTime
        }

        // Create ICP-specific escrow extension
        const icpExtension = new ICPEscrowExtension(
            escrowFactory,
            details.auction,
            ZX,
            undefined,
            escrowParams.hashLock,
            escrowParams.dstChainId,
            escrowParams.icpTokenLedger?.toEVMAddress() || Address.ZERO_ADDRESS,
            escrowParams.srcSafetyDeposit,
            escrowParams.dstSafetyDeposit,
            escrowParams.timeLocks.toEVMTimelocks(),
            escrowParams.icpCanisterId,
            escrowParams.icpPrincipal
        )

        return new ICPCrossChainOrder(icpExtension, evmOrderInfo, extra)
    }

    /**
     * Create ICP cross-chain order from existing data and extension
     */
    public static fromDataAndExtension(
        order: LimitOrderV4Struct,
        extension: Extension
    ): ICPCrossChainOrder {
        const icpExtension = ICPEscrowExtension.fromExtension(extension)
        
        return new ICPCrossChainOrder(icpExtension, order, undefined)
    }

    /**
     * Build the order for submission
     */
    public build(): LimitOrderV4Struct {
        return this.inner.build()
    }

    /**
     * Get order hash for source chain
     */
    public getOrderHash(srcChainId: number): string {
        return this.inner.getOrderHash(srcChainId)
    }

    /**
     * Get typed data for signing
     */
    public getTypedData(srcChainId: number): EIP712TypedData {
        return this.inner.getTypedData(srcChainId)
    }

    /**
     * Get auction calculator
     */
    public getCalculator(): AuctionCalculator {
        return this.inner.getCalculator()
    }

    /**
     * Calculate taking amount for given making amount
     */
    public calcTakingAmount(
        makingAmount: bigint,
        time: bigint,
        blockBaseFee?: bigint
    ): bigint {
        return this.inner.calcTakingAmount(makingAmount, time, blockBaseFee)
    }

    /**
     * Check if order can be executed by given executor at given time
     */
    public canExecuteAt(executor: Address, executionTime: bigint): boolean {
        return this.inner.canExecuteAt(executor, executionTime)
    }

    /**
     * Check if order is expired at given time
     */
    public isExpiredAt(time: bigint): boolean {
        return this.inner.isExpiredAt(time)
    }

    /**
     * Get resolver fee for given filled amount
     */
    public getResolverFee(filledMakingAmount: bigint): bigint {
        return this.inner.getResolverFee(filledMakingAmount)
    }

    /**
     * Check if wallet is exclusive resolver
     */
    public isExclusiveResolver(wallet: Address): boolean {
        return this.inner.isExclusiveResolver(wallet)
    }

    /**
     * Check if order is in exclusivity period
     */
    public isExclusivityPeriod(time = now()): boolean {
        return this.inner.isExclusivityPeriod(time)
    }

    /**
     * Create source chain immutables for EVM deployment
     */
    public toSrcImmutables(
        srcChainId: SupportedChain,
        taker: Address,
        amount: bigint,
        hashLock = this.escrowExtension.hashLockInfo
    ): Immutables {
        return this.inner.toSrcImmutables(srcChainId, taker, amount, hashLock)
    }

    /**
     * Create destination chain immutables for ICP deployment
     */
    public toDstImmutables(
        dstChainId: SupportedChain,
        taker: Address,
        amount: bigint,
        hashLock = this.escrowExtension.hashLockInfo
    ): ICPImmutables {
        return new ICPImmutables({
            orderHash: this.getOrderHash(dstChainId),
            hashlock: hashLock.toString(),
            maker: this.maker.toString(),
            taker: taker.toString(),
            token: this.escrowExtension.icpTokenLedger?.toString() || '',
            amount: amount,
            safetyDeposit: this.escrowExtension.dstSafetyDeposit,
            timelocks: new ICPTimelocks(this.escrowExtension.timeLocks),
            chainId: dstChainId,
            icpCanisterId: this.escrowExtension.icpCanisterId,
            icpPrincipal: this.escrowExtension.icpPrincipal
        })
    }

    /**
     * Get multiple fill index for given amount
     */
    public getMultipleFillIdx(
        fillAmount: bigint,
        remainingAmount = this.makingAmount
    ): number {
        return this.inner.getMultipleFillIdx(fillAmount, remainingAmount)
    }

    /**
     * Validate ICP order information
     */
    private static validateICPOrderInfo(orderInfo: ICPCrossChainOrderInfo): void {
        assert(orderInfo.makerAsset.isValid(), 'Invalid maker asset address')
        assert(orderInfo.takerAsset.isValid(), 'Invalid taker asset (ICP address)')
        assert(orderInfo.maker.isValid(), 'Invalid maker address')
        assert(orderInfo.makingAmount > 0n, 'Making amount must be positive')
        assert(orderInfo.takingAmount > 0n, 'Taking amount must be positive')
        
        if (orderInfo.receiver) {
            assert(orderInfo.receiver.isValid(), 'Invalid receiver ICP address')
        }
        
        if (orderInfo.icpCanisterId) {
            assert(orderInfo.icpCanisterId.isValid(), 'Invalid ICP canister ID')
        }
        
        if (orderInfo.icpPrincipal) {
            assert(orderInfo.icpPrincipal.isValid(), 'Invalid ICP principal')
        }
    }

    /**
     * Validate ICP escrow parameters
     */
    private static validateICPEscrowParams(escrowParams: ICPEscrowParams): void {
        assert(escrowParams.hashLock.isValid(), 'Invalid hashlock')
        assert(isSupportedChain(escrowParams.srcChainId), 'Unsupported source chain')
        assert(isSupportedChain(escrowParams.dstChainId), 'Unsupported destination chain')
        assert(escrowParams.srcSafetyDeposit > 0n, 'Source safety deposit must be positive')
        assert(escrowParams.dstSafetyDeposit > 0n, 'Destination safety deposit must be positive')
        assert(escrowParams.icpCanisterId.isValid(), 'Invalid ICP canister ID')
        assert(escrowParams.icpPrincipal.isValid(), 'Invalid ICP principal')
        
        if (escrowParams.icpTokenLedger) {
            assert(escrowParams.icpTokenLedger.isValid(), 'Invalid ICP token ledger')
        }
    }

    /**
     * Validate ICP details
     */
    private static validateICPDetails(details: ICPDetails): void {
        assert(details.auction, 'Auction details required')
        assert(details.whitelist.length > 0, 'Whitelist required')
        
        if (details.icp) {
            if (details.icp.icpWhitelist) {
                for (const principal of details.icp.icpWhitelist) {
                    assert(principal.isValid(), 'Invalid ICP whitelist principal')
                }
            }
        }
    }

    /**
     * Create ICP order from parameters
     */
    public static fromParams(params: ICPOrderCreationParams): ICPCrossChainOrder {
        return ICPCrossChainOrder.new(
            new Address(params.escrowParams.icpCanisterId.toEVMAddress()),
            params.orderInfo,
            params.escrowParams,
            params.details,
            params.extra
        )
    }

    /**
     * Get ICP-specific order information
     */
    public getICPOrderInfo(): ICPCrossChainOrderInfo {
        return {
            makerAsset: this.makerAsset,
            takerAsset: this.escrowExtension.icpTokenLedger 
                ? ICPAddress.fromEVMAddress(this.escrowExtension.icpTokenLedger)
                : ICPAddress.zero(),
            makingAmount: this.makingAmount,
            takingAmount: this.takingAmount,
            maker: this.maker,
            salt: this.salt,
            receiver: this.receiver.isZero() 
                ? undefined 
                : ICPAddress.fromEVMAddress(this.receiver),
            icpCanisterId: this.escrowExtension.icpCanisterId,
            icpPrincipal: this.escrowExtension.icpPrincipal
        }
    }

    /**
     * Get ICP-specific escrow parameters
     */
    public getICPEscrowParams(): ICPEscrowParams {
        return {
            hashLock: this.escrowExtension.hashLockInfo,
            srcChainId: this.escrowExtension.srcChainId || 1, // Default to Ethereum
            dstChainId: this.dstChainId,
            srcSafetyDeposit: this.escrowExtension.srcSafetyDeposit,
            dstSafetyDeposit: this.escrowExtension.dstSafetyDeposit,
            timeLocks: new ICPTimelocks(this.escrowExtension.timeLocks),
            icpCanisterId: this.escrowExtension.icpCanisterId,
            icpPrincipal: this.escrowExtension.icpPrincipal,
            icpTokenLedger: this.escrowExtension.icpTokenLedger
        }
    }
} 