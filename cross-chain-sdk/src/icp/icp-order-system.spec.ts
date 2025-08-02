import { describe, it, expect, beforeEach } from '@jest/globals'
import { Address, NetworkEnum, AuctionDetails, AuctionWhitelistItem } from '@1inch/fusion-sdk'
import { HashLock } from '../cross-chain-order/hash-lock'
import { TimeLocks } from '../cross-chain-order/time-locks'
import { ICPAddressClass } from './icp-address'
import { ICPTimelocks } from './icp-timelocks'
import { ICPImmutables } from './icp-immutables'
import { ICPEscrowFactory } from './icp-escrow-factory'
import { ICPEscrowExtension } from './icp-escrow-extension'
import { ICPCrossChainOrder } from './icp-cross-chain-order'
import { ICPOrderExecution } from './icp-order-execution'
import { 
    ICPCrossChainOrderInfo, 
    ICPDetails, 
    ICPEscrowParams, 
    ICPExtra,
    ICPOrderCreationParams 
} from './icp-order-types'

describe('ICP Order System (Phase 8C)', () => {
    let icpFactory: ICPEscrowFactory
    let orderExecution: ICPOrderExecution
    let testAddress: Address
    let testICPAddress: ICPAddressClass
    let testHashLock: HashLock
    let testTimeLocks: TimeLocks
    let testICPTimelocks: ICPTimelocks

    beforeEach(() => {
        // Initialize test components
        icpFactory = new ICPEscrowFactory({
            canisterId: ICPAddressClass.fromString('uxrrr-q7777-77774-qaaaq-cai'),
            cycles: 1000000000n,
            memoryLimit: 1000000n
        })
        
        orderExecution = new ICPOrderExecution(icpFactory)
        
        testAddress = new Address('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')
        testICPAddress = ICPAddressClass.fromString('uxrrr-q7777-77774-qaaaq-cai')
        testHashLock = HashLock.forSingleFill('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
        testTimeLocks = TimeLocks.new({
            srcWithdrawal: 10n,
            srcPublicWithdrawal: 120n,
            srcCancellation: 121n,
            dstWithdrawal: 10n,
            dstPublicWithdrawal: 100n,
            dstCancellation: 101n
        })
        testICPTimelocks = new ICPTimelocks(testTimeLocks)
    })

    describe('ICPEscrowExtension', () => {
        it('should create ICP escrow extension with valid parameters', () => {
            const auctionDetails = new AuctionDetails({
                startTime: 1000n,
                endTime: 2000n,
                initialRateBump: 5000n,
                finalRateBump: 10000n,
                duration: 1000n
            })

            const extension = new ICPEscrowExtension(
                testAddress,
                auctionDetails,
                '0x',
                undefined,
                testHashLock,
                NetworkEnum.INTERNET_COMPUTER,
                testAddress,
                1000000n,
                1000000n,
                testTimeLocks,
                testICPAddress,
                testICPAddress
            )

            expect(extension).toBeDefined()
            expect(extension.hashLockInfo).toEqual(testHashLock)
            expect(extension.dstChainId).toBe(NetworkEnum.INTERNET_COMPUTER)
            expect(extension.icpCanisterId).toEqual(testICPAddress)
            expect(extension.icpPrincipal).toEqual(testICPAddress)
        })

        it('should validate ICP escrow extension parameters', () => {
            const auctionDetails = new AuctionDetails({
                startTime: 1000n,
                endTime: 2000n,
                initialRateBump: 5000n,
                finalRateBump: 10000n,
                duration: 1000n
            })

            const extension = new ICPEscrowExtension(
                testAddress,
                auctionDetails,
                '0x',
                undefined,
                testHashLock,
                NetworkEnum.INTERNET_COMPUTER,
                testAddress,
                1000000n,
                1000000n,
                testTimeLocks,
                testICPAddress,
                testICPAddress
            )

            expect(() => extension.validate()).not.toThrow()
        })

        it('should create ICP immutables from extension', () => {
            const auctionDetails = new AuctionDetails({
                startTime: 1000n,
                endTime: 2000n,
                initialRateBump: 5000n,
                finalRateBump: 10000n,
                duration: 1000n
            })

            const extension = new ICPEscrowExtension(
                testAddress,
                auctionDetails,
                '0x',
                undefined,
                testHashLock,
                NetworkEnum.INTERNET_COMPUTER,
                testAddress,
                1000000n,
                1000000n,
                testTimeLocks,
                testICPAddress,
                testICPAddress
            )

            const immutables = extension.toICPImmutables()
            expect(immutables).toBeInstanceOf(ICPImmutables)
            expect(immutables.orderHash).toBe(testHashLock.toString())
            expect(immutables.hashlock).toBe(testHashLock.toString())
        })
    })

    describe('ICPCrossChainOrder', () => {
        let orderInfo: ICPCrossChainOrderInfo
        let escrowParams: ICPEscrowParams
        let details: ICPDetails

        beforeEach(() => {
            orderInfo = {
                makerAsset: testAddress,
                takerAsset: testICPAddress,
                makingAmount: 1000000n,
                takingAmount: 1000000n,
                maker: testAddress,
                salt: 12345n,
                receiver: testICPAddress,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress
            }

            escrowParams = {
                hashLock: testHashLock,
                srcChainId: NetworkEnum.ETHEREUM,
                dstChainId: NetworkEnum.INTERNET_COMPUTER,
                srcSafetyDeposit: 1000000n,
                dstSafetyDeposit: 1000000n,
                timeLocks: testICPTimelocks,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress,
                icpTokenLedger: testICPAddress
            }

            details = {
                auction: new AuctionDetails({
                    startTime: 1000n,
                    endTime: 2000n,
                    initialRateBump: 5000n,
                    finalRateBump: 10000n,
                    duration: 1000n
                }),
                whitelist: [new AuctionWhitelistItem(testAddress, 0n)],
                resolvingStartTime: 0n
            }
        })

        it('should create ICP cross-chain order with valid parameters', () => {
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            expect(order).toBeDefined()
            expect(order.maker).toEqual(testAddress)
            expect(order.makingAmount).toBe(1000000n)
            expect(order.takingAmount).toBe(1000000n)
            expect(order.dstChainId).toBe(NetworkEnum.INTERNET_COMPUTER)
        })

        it('should validate ICP order information', () => {
            // Valid order should not throw
            expect(() => {
                ICPCrossChainOrder.new(
                    testAddress,
                    orderInfo,
                    escrowParams,
                    details
                )
            }).not.toThrow()
        })

        it('should reject invalid ICP order information', () => {
            const invalidOrderInfo = {
                ...orderInfo,
                makingAmount: 0n // Invalid: zero amount
            }

            expect(() => {
                ICPCrossChainOrder.new(
                    testAddress,
                    invalidOrderInfo,
                    escrowParams,
                    details
                )
            }).toThrow('Making amount must be positive')
        })

        it('should create source chain immutables', () => {
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            const srcImmutables = order.toSrcImmutables(
                NetworkEnum.ETHEREUM,
                testAddress,
                1000000n
            )

            expect(srcImmutables).toBeDefined()
            expect(srcImmutables.orderHash).toBeDefined()
            expect(srcImmutables.hashlock).toBe(testHashLock.toString())
        })

        it('should create destination chain immutables', () => {
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            const dstImmutables = order.toDstImmutables(
                NetworkEnum.INTERNET_COMPUTER,
                testAddress,
                1000000n
            )

            expect(dstImmutables).toBeInstanceOf(ICPImmutables)
            expect(dstImmutables.orderHash).toBeDefined()
            expect(dstImmutables.hashlock).toBe(testHashLock.toString())
            expect(dstImmutables.icpCanisterId).toEqual(testICPAddress)
            expect(dstImmutables.icpPrincipal).toEqual(testICPAddress)
        })

        it('should get ICP-specific order information', () => {
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            const icpOrderInfo = order.getICPOrderInfo()
            expect(icpOrderInfo.makerAsset).toEqual(testAddress)
            expect(icpOrderInfo.takerAsset).toEqual(testICPAddress)
            expect(icpOrderInfo.makingAmount).toBe(1000000n)
            expect(icpOrderInfo.takingAmount).toBe(1000000n)
            expect(icpOrderInfo.icpCanisterId).toEqual(testICPAddress)
            expect(icpOrderInfo.icpPrincipal).toEqual(testICPAddress)
        })

        it('should get ICP-specific escrow parameters', () => {
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            const icpEscrowParams = order.getICPEscrowParams()
            expect(icpEscrowParams.hashLock).toEqual(testHashLock)
            expect(icpEscrowParams.dstChainId).toBe(NetworkEnum.INTERNET_COMPUTER)
            expect(icpEscrowParams.icpCanisterId).toEqual(testICPAddress)
            expect(icpEscrowParams.icpPrincipal).toEqual(testICPAddress)
        })

        it('should create order from parameters', () => {
            const params: ICPOrderCreationParams = {
                orderInfo,
                escrowParams,
                details
            }

            const order = ICPCrossChainOrder.fromParams(params)
            expect(order).toBeDefined()
            expect(order.maker).toEqual(testAddress)
            expect(order.dstChainId).toBe(NetworkEnum.INTERNET_COMPUTER)
        })
    })

    describe('ICPOrderExecution', () => {
        let order: ICPCrossChainOrder
        let orderInfo: ICPCrossChainOrderInfo
        let escrowParams: ICPEscrowParams
        let details: ICPDetails

        beforeEach(() => {
            orderInfo = {
                makerAsset: testAddress,
                takerAsset: testICPAddress,
                makingAmount: 1000000n,
                takingAmount: 1000000n,
                maker: testAddress,
                salt: 12345n,
                receiver: testICPAddress,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress
            }

            escrowParams = {
                hashLock: testHashLock,
                srcChainId: NetworkEnum.ETHEREUM,
                dstChainId: NetworkEnum.INTERNET_COMPUTER,
                srcSafetyDeposit: 1000000n,
                dstSafetyDeposit: 1000000n,
                timeLocks: testICPTimelocks,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress,
                icpTokenLedger: testICPAddress
            }

            details = {
                auction: new AuctionDetails({
                    startTime: 1000n,
                    endTime: 2000n,
                    initialRateBump: 5000n,
                    finalRateBump: 10000n,
                    duration: 1000n
                }),
                whitelist: [new AuctionWhitelistItem(testAddress, 0n)],
                resolvingStartTime: 0n
            }

            order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )
        })

        it('should validate ICP cross-chain order', () => {
            const validation = orderExecution.validateOrder(order)
            expect(validation.isValid).toBe(true)
            expect(validation.errors).toHaveLength(0)
        })

        it('should reject invalid orders', () => {
            const invalidOrderInfo = {
                ...orderInfo,
                makingAmount: 0n
            }

            const invalidOrder = ICPCrossChainOrder.new(
                testAddress,
                invalidOrderInfo,
                escrowParams,
                details
            )

            const validation = orderExecution.validateOrder(invalidOrder)
            expect(validation.isValid).toBe(false)
            expect(validation.errors).toContain('Making amount must be positive')
        })

        it('should check if order can be executed', () => {
            const canExecute = orderExecution.canExecuteOrder(order, testAddress)
            expect(typeof canExecute).toBe('boolean')
        })

        it('should get order execution deadline', () => {
            const deadline = orderExecution.getOrderDeadline(order)
            expect(typeof deadline).toBe('bigint')
            expect(deadline).toBeGreaterThan(0n)
        })

        it('should check if order is expired', () => {
            const isExpired = orderExecution.isOrderExpired(order)
            expect(typeof isExpired).toBe('boolean')
        })

        it('should calculate execution fee', () => {
            const fee = orderExecution.calculateExecutionFee(order, 500000n)
            expect(typeof fee).toBe('bigint')
            expect(fee).toBeGreaterThanOrEqual(0n)
        })

        it('should get ICP factory instance', () => {
            const factory = orderExecution.getICPEscrowFactory()
            expect(factory).toBe(icpFactory)
        })

        it('should manage order statuses', () => {
            const orderHash = order.getOrderHash(NetworkEnum.INTERNET_COMPUTER)
            
            // Initially no status
            expect(orderExecution.getOrderStatus(orderHash)).toBeUndefined()
            
            // Update source chain status
            orderExecution.updateSourceChainStatus(orderHash, { escrowDeployed: true })
            const status = orderExecution.getOrderStatus(orderHash)
            expect(status?.sourceChain.escrowDeployed).toBe(true)
            
            // Update destination chain status
            orderExecution.updateDestinationChainStatus(orderHash, { funded: true })
            const updatedStatus = orderExecution.getOrderStatus(orderHash)
            expect(updatedStatus?.destinationChain.funded).toBe(true)
        })

        it('should get all order statuses', () => {
            const allStatuses = orderExecution.getAllOrderStatuses()
            expect(allStatuses).toBeInstanceOf(Map)
        })

        it('should get pending orders', () => {
            const pendingOrders = orderExecution.getPendingOrders()
            expect(pendingOrders).toBeInstanceOf(Map)
        })

        it('should clear completed orders', () => {
            // Add a completed order status
            const orderHash = 'test-hash'
            const completedStatus = {
                orderHash,
                sourceChain: { escrowDeployed: true, funded: true, withdrawn: true },
                destinationChain: { escrowDeployed: true, funded: true, withdrawn: true },
                status: 'executed' as const
            }
            
            // Mock the orders map
            (orderExecution as any).orders.set(orderHash, completedStatus)
            
            // Clear completed orders
            orderExecution.clearCompletedOrders()
            
            // Should be removed
            expect(orderExecution.getOrderStatus(orderHash)).toBeUndefined()
        })
    })

    describe('Integration Tests', () => {
        it('should create complete ICP order system workflow', () => {
            // Create order info
            const orderInfo: ICPCrossChainOrderInfo = {
                makerAsset: testAddress,
                takerAsset: testICPAddress,
                makingAmount: 1000000n,
                takingAmount: 1000000n,
                maker: testAddress,
                salt: 12345n,
                receiver: testICPAddress,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress
            }

            // Create escrow params
            const escrowParams: ICPEscrowParams = {
                hashLock: testHashLock,
                srcChainId: NetworkEnum.ETHEREUM,
                dstChainId: NetworkEnum.INTERNET_COMPUTER,
                srcSafetyDeposit: 1000000n,
                dstSafetyDeposit: 1000000n,
                timeLocks: testICPTimelocks,
                icpCanisterId: testICPAddress,
                icpPrincipal: testICPAddress,
                icpTokenLedger: testICPAddress
            }

            // Create details
            const details: ICPDetails = {
                auction: new AuctionDetails({
                    startTime: 1000n,
                    endTime: 2000n,
                    initialRateBump: 5000n,
                    finalRateBump: 10000n,
                    duration: 1000n
                }),
                whitelist: [new AuctionWhitelistItem(testAddress, 0n)],
                resolvingStartTime: 0n
            }

            // Create order
            const order = ICPCrossChainOrder.new(
                testAddress,
                orderInfo,
                escrowParams,
                details
            )

            // Validate order
            const validation = orderExecution.validateOrder(order)
            expect(validation.isValid).toBe(true)

            // Create immutables
            const srcImmutables = order.toSrcImmutables(
                NetworkEnum.ETHEREUM,
                testAddress,
                1000000n
            )
            const dstImmutables = order.toDstImmutables(
                NetworkEnum.INTERNET_COMPUTER,
                testAddress,
                1000000n
            )

            expect(srcImmutables).toBeDefined()
            expect(dstImmutables).toBeInstanceOf(ICPImmutables)

            // Get order information
            const icpOrderInfo = order.getICPOrderInfo()
            const icpEscrowParams = order.getICPEscrowParams()

            expect(icpOrderInfo.makerAsset).toEqual(testAddress)
            expect(icpEscrowParams.hashLock).toEqual(testHashLock)

            // Complete workflow validation
            expect(order.maker).toEqual(testAddress)
            expect(order.dstChainId).toBe(NetworkEnum.INTERNET_COMPUTER)
            expect(order.makingAmount).toBe(1000000n)
            expect(order.takingAmount).toBe(1000000n)
        })
    })
}) 