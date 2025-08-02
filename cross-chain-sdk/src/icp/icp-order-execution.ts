import {
    Address,
    NetworkEnum,
    now
} from '@1inch/fusion-sdk'
import {ICPCrossChainOrder} from './icp-cross-chain-order'
import {ICPImmutables} from './icp-immutables'
import {ICPEscrowFactory} from './icp-escrow-factory'
import {ICPAddress} from './icp-address'
import {ICPTimelocks} from './icp-timelocks'
import {HashLock} from '../cross-chain-order/hash-lock'
import {SupportedChain} from '../chains'
import {ICPOrderExecutionStatus, ICPOrderValidation} from './icp-order-types'

/**
 * ICP Order Execution Manager
 * Handles the execution of ICP cross-chain orders including:
 * - Order validation
 * - Escrow deployment
 * - Order state management
 * - Execution tracking
 */
export class ICPOrderExecution {
    private icpFactory: ICPEscrowFactory
    private orders: Map<string, ICPOrderExecutionStatus> = new Map()

    constructor(icpFactory: ICPEscrowFactory) {
        this.icpFactory = icpFactory
    }

    /**
     * Validate ICP cross-chain order
     */
    public validateOrder(order: ICPCrossChainOrder): ICPOrderValidation {
        const errors: string[] = []
        const warnings: string[] = []

        try {
            // Validate basic order properties
            if (order.makingAmount <= 0n) {
                errors.push('Making amount must be positive')
            }

            if (order.takingAmount <= 0n) {
                errors.push('Taking amount must be positive')
            }

            if (!order.maker.isValid()) {
                errors.push('Invalid maker address')
            }

            // Validate ICP-specific properties
            const icpOrderInfo = order.getICPOrderInfo()
            if (!icpOrderInfo.takerAsset.isValid()) {
                errors.push('Invalid ICP taker asset')
            }

            if (icpOrderInfo.receiver && !icpOrderInfo.receiver.isValid()) {
                errors.push('Invalid ICP receiver address')
            }

            // Validate timelocks
            const escrowParams = order.getICPEscrowParams()
            if (!escrowParams.timeLocks.isValid()) {
                errors.push('Invalid ICP timelocks')
            }

            // Validate hashlock
            if (!escrowParams.hashLock.isValid()) {
                errors.push('Invalid hashlock')
            }

            // Validate chain compatibility
            if (escrowParams.srcChainId === escrowParams.dstChainId) {
                errors.push('Source and destination chains must be different')
            }

            // Check if order is expired
            if (order.isExpiredAt(now())) {
                errors.push('Order is expired')
            }

            // Check if order is in exclusivity period
            if (order.isExclusivityPeriod()) {
                warnings.push('Order is in exclusivity period')
            }

            // Validate ICP canister and principal
            if (!escrowParams.icpCanisterId.isValid()) {
                errors.push('Invalid ICP canister ID')
            }

            if (!escrowParams.icpPrincipal.isValid()) {
                errors.push('Invalid ICP principal')
            }

        } catch (error) {
            errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        }
    }

    /**
     * Execute ICP cross-chain order
     */
    public async executeOrder(
        order: ICPCrossChainOrder,
        taker: Address,
        amount: bigint,
        hashLock?: HashLock
    ): Promise<ICPOrderExecutionStatus> {
        const orderHash = order.getOrderHash(order.dstChainId)
        
        // Initialize order status
        const orderStatus: ICPOrderExecutionStatus = {
            orderHash,
            sourceChain: {
                escrowDeployed: false,
                funded: false,
                withdrawn: false
            },
            destinationChain: {
                escrowDeployed: false,
                funded: false,
                withdrawn: false
            },
            status: 'pending'
        }

        this.orders.set(orderHash, orderStatus)

        try {
            // Validate order
            const validation = this.validateOrder(order)
            if (!validation.isValid) {
                orderStatus.status = 'failed'
                orderStatus.error = validation.errors.join(', ')
                return orderStatus
            }

            // Create ICP immutables for destination chain
            const icpImmutables = order.toDstImmutables(
                order.dstChainId,
                taker,
                amount,
                hashLock
            )

            // Deploy ICP escrow
            const escrowCanisterId = await this.icpFactory.deployEscrow(icpImmutables)
            
            orderStatus.destinationChain.escrowDeployed = true
            orderStatus.destinationChain.escrowCanisterId = escrowCanisterId.toString()
            orderStatus.status = 'deployed'

            // Update order status
            this.orders.set(orderHash, orderStatus)

            return orderStatus

        } catch (error) {
            orderStatus.status = 'failed'
            orderStatus.error = error instanceof Error ? error.message : 'Unknown error'
            this.orders.set(orderHash, orderStatus)
            throw error
        }
    }

    /**
     * Fund ICP escrow with tokens
     */
    public async fundICPEscrow(
        orderHash: string,
        amount: bigint,
        tokenLedger?: ICPAddress
    ): Promise<boolean> {
        const orderStatus = this.orders.get(orderHash)
        if (!orderStatus) {
            throw new Error('Order not found')
        }

        if (!orderStatus.destinationChain.escrowDeployed) {
            throw new Error('ICP escrow not deployed')
        }

        try {
            // Fund the ICP escrow with tokens
            const canisterId = ICPAddress.fromString(orderStatus.destinationChain.escrowCanisterId!)
            await this.icpFactory.fundEscrow(canisterId, amount, tokenLedger)
            
            orderStatus.destinationChain.funded = true
            orderStatus.status = 'funded'
            this.orders.set(orderHash, orderStatus)

            return true

        } catch (error) {
            orderStatus.status = 'failed'
            orderStatus.error = error instanceof Error ? error.message : 'Unknown error'
            this.orders.set(orderHash, orderStatus)
            throw error
        }
    }

    /**
     * Withdraw from ICP escrow using secret
     */
    public async withdrawFromICPEscrow(
        orderHash: string,
        secret: string
    ): Promise<boolean> {
        const orderStatus = this.orders.get(orderHash)
        if (!orderStatus) {
            throw new Error('Order not found')
        }

        if (!orderStatus.destinationChain.escrowDeployed) {
            throw new Error('ICP escrow not deployed')
        }

        if (!orderStatus.destinationChain.funded) {
            throw new Error('ICP escrow not funded')
        }

        try {
            // Withdraw from ICP escrow using secret
            const canisterId = ICPAddress.fromString(orderStatus.destinationChain.escrowCanisterId!)
            await this.icpFactory.withdrawFromEscrow(canisterId, secret)
            
            orderStatus.destinationChain.withdrawn = true
            orderStatus.status = 'executed'
            this.orders.set(orderHash, orderStatus)

            return true

        } catch (error) {
            orderStatus.status = 'failed'
            orderStatus.error = error instanceof Error ? error.message : 'Unknown error'
            this.orders.set(orderHash, orderStatus)
            throw error
        }
    }

    /**
     * Cancel ICP escrow
     */
    public async cancelICPEscrow(orderHash: string): Promise<boolean> {
        const orderStatus = this.orders.get(orderHash)
        if (!orderStatus) {
            throw new Error('Order not found')
        }

        if (!orderStatus.destinationChain.escrowDeployed) {
            throw new Error('ICP escrow not deployed')
        }

        try {
            // Cancel ICP escrow
            const canisterId = ICPAddress.fromString(orderStatus.destinationChain.escrowCanisterId!)
            await this.icpFactory.cancelEscrow(canisterId)
            
            orderStatus.status = 'cancelled'
            this.orders.set(orderHash, orderStatus)

            return true

        } catch (error) {
            orderStatus.status = 'failed'
            orderStatus.error = error instanceof Error ? error.message : 'Unknown error'
            this.orders.set(orderHash, orderStatus)
            throw error
        }
    }

    /**
     * Get order execution status
     */
    public getOrderStatus(orderHash: string): ICPOrderExecutionStatus | undefined {
        return this.orders.get(orderHash)
    }

    /**
     * Get all order statuses
     */
    public getAllOrderStatuses(): Map<string, ICPOrderExecutionStatus> {
        return new Map(this.orders)
    }

    /**
     * Update source chain status
     */
    public updateSourceChainStatus(
        orderHash: string,
        status: Partial<ICPOrderExecutionStatus['sourceChain']>
    ): void {
        const orderStatus = this.orders.get(orderHash)
        if (orderStatus) {
            orderStatus.sourceChain = { ...orderStatus.sourceChain, ...status }
            this.orders.set(orderHash, orderStatus)
        }
    }

    /**
     * Update destination chain status
     */
    public updateDestinationChainStatus(
        orderHash: string,
        status: Partial<ICPOrderExecutionStatus['destinationChain']>
    ): void {
        const orderStatus = this.orders.get(orderHash)
        if (orderStatus) {
            orderStatus.destinationChain = { ...orderStatus.destinationChain, ...status }
            this.orders.set(orderHash, orderStatus)
        }
    }

    /**
     * Check if order can be executed
     */
    public canExecuteOrder(order: ICPCrossChainOrder, executor: Address): boolean {
        return order.canExecuteAt(executor, now())
    }

    /**
     * Get order execution deadline
     */
    public getOrderDeadline(order: ICPCrossChainOrder): bigint {
        return order.deadline
    }

    /**
     * Check if order is expired
     */
    public isOrderExpired(order: ICPCrossChainOrder): boolean {
        return order.isExpiredAt(now())
    }

    /**
     * Calculate execution fee for order
     */
    public calculateExecutionFee(order: ICPCrossChainOrder, filledAmount: bigint): bigint {
        return order.getResolverFee(filledAmount)
    }

    /**
     * Get ICP factory instance
     */
    public getICPEscrowFactory(): ICPEscrowFactory {
        return this.icpFactory
    }

    /**
     * Clear completed orders
     */
    public clearCompletedOrders(): void {
        for (const [orderHash, status] of this.orders.entries()) {
            if (status.status === 'executed' || status.status === 'cancelled' || status.status === 'failed') {
                this.orders.delete(orderHash)
            }
        }
    }

    /**
     * Get pending orders
     */
    public getPendingOrders(): Map<string, ICPOrderExecutionStatus> {
        const pending = new Map<string, ICPOrderExecutionStatus>()
        for (const [orderHash, status] of this.orders.entries()) {
            if (status.status === 'pending' || status.status === 'deployed' || status.status === 'funded') {
                pending.set(orderHash, status)
            }
        }
        return pending
    }
} 