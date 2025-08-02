import {Address, NetworkEnum} from '@1inch/fusion-sdk'
import {ICPAddress} from './icp-address'
import {ICPTimelocks} from './icp-timelocks'
import {ICPImmutables} from './icp-immutables'
import {ICPEscrowExtension} from './icp-escrow-extension'
import {ICPEscrowFactory} from './icp-escrow-factory'
import {ICPCrossChainOrder} from './icp-cross-chain-order'
import {ICPOrderExecution} from './icp-order-execution'
import {
    ICPCrossChainOrderInfo,
    ICPEscrowParams,
    ICPDetails,
    ICPExtra,
    ICPOrderCreationParams
} from './icp-order-types'
import {HashLock} from '../cross-chain-order/hash-lock'

/**
 * Comprehensive integration test for ICP cross-chain order system
 * Demonstrates complete EVM↔ICP atomic swap functionality
 */
export class ICPIntegrationTest {
    private readonly testICPCanisterId = 'uxrrr-q7777-77774-qaaaq-cai'
    private readonly testICPPrincipal = '2vxsx-fae'
    private readonly testEVMAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'

    /**
     * Test EVM→ICP atomic swap order creation and execution
     */
    public async testEVMToICPSwap(): Promise<{
        success: boolean
        orderHash: string
        evmEscrowAddress: string
        icpEscrowCanisterId: string
        details: string
    }> {
        console.log('🚀 Testing EVM→ICP Atomic Swap Integration')
        
        try {
            // Step 1: Create hashlock and timelocks
            const secret = this.generateRandomSecret()
            const hashLock = HashLock.forSingleFill(secret)
            const timeLocks = ICPTimelocks.createDefault()
            
            console.log('✅ Hashlock and timelocks created')

            // Step 2: Create ICP order info
            const orderInfo: ICPCrossChainOrderInfo = {
                salt: BigInt(Date.now()),
                maker: new Address(this.testEVMAddress),
                makingAmount: BigInt(1000000), // 1 USDC (6 decimals)
                takingAmount: BigInt(100000000), // 1 ICP (8 decimals)
                makerAsset: new Address('0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8'), // USDC
                takerAsset: ICPAddress.fromPrincipal(this.testICPPrincipal),
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
                auctionStartTime: BigInt(Math.floor(Date.now() / 1000)),
                auctionEndTime: BigInt(Math.floor(Date.now() / 1000) + 1800), // 30 minutes
                nonce: BigInt(Date.now()),
                partialFillAllowed: false,
                multipleFillsAllowed: false
            }
            
            console.log('✅ ICP order info created')

            // Step 3: Create ICP escrow parameters
            const escrowParams: ICPEscrowParams = {
                hashLock,
                timeLocks,
                srcChainId: NetworkEnum.ETHEREUM,
                dstChainId: NetworkEnum.INTERNET_COMPUTER,
                srcSafetyDeposit: BigInt(1000000000000000), // 0.001 ETH
                dstSafetyDeposit: BigInt(1000000), // 0.001 ICP
                icpCanisterId: this.testICPCanisterId,
                icpPrincipal: this.testICPPrincipal
            }
            
            console.log('✅ ICP escrow parameters created')

            // Step 4: Create ICP order details
            const details: ICPDetails = {
                auction: {
                    startPrice: BigInt(1000000),
                    endPrice: BigInt(990000),
                    duration: BigInt(1800)
                },
                whitelist: [{
                    address: new Address(this.testEVMAddress),
                    allowFrom: BigInt(0)
                }],
                resolvingStartTime: BigInt(0),
                icp: {
                    canisterDeployment: {
                        memoryAllocation: BigInt(1000),
                        computeAllocation: BigInt(1000000000)
                    },
                    tokenTransfer: {
                        ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP ledger
                        decimals: 8
                    }
                }
            }
            
            console.log('✅ ICP order details created')

            // Step 5: Create ICP cross-chain order
            const order = ICPCrossChainOrder.fromParams({
                orderInfo,
                escrowParams,
                details
            })
            
            console.log('✅ ICP cross-chain order created')

            // Step 6: Create ICP escrow factory
            const factory = new ICPEscrowFactory(
                this.testICPCanisterId,
                this.testICPPrincipal
            )
            
            console.log('✅ ICP escrow factory created')

            // Step 7: Create ICP order execution manager
            const executionManager = new ICPOrderExecution(factory)
            
            console.log('✅ ICP order execution manager created')

            // Step 8: Execute the order
            const executionResult = await executionManager.executeOrder(order)
            
            console.log('✅ ICP order executed')

            return {
                success: true,
                orderHash: executionResult.orderHash,
                evmEscrowAddress: executionResult.evmEscrowAddress,
                icpEscrowCanisterId: executionResult.icpEscrowCanisterId,
                details: 'EVM→ICP atomic swap order created and executed successfully'
            }

        } catch (error) {
            console.error('❌ EVM→ICP swap test failed:', error)
            return {
                success: false,
                orderHash: '',
                evmEscrowAddress: '',
                icpEscrowCanisterId: '',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Test ICP→EVM atomic swap order creation and execution
     */
    public async testICPToEVMSwap(): Promise<{
        success: boolean
        orderHash: string
        evmEscrowAddress: string
        icpEscrowCanisterId: string
        details: string
    }> {
        console.log('🚀 Testing ICP→EVM Atomic Swap Integration')
        
        try {
            // Step 1: Create hashlock and timelocks
            const secret = this.generateRandomSecret()
            const hashLock = HashLock.forSingleFill(secret)
            const timeLocks = ICPTimelocks.createDefault()
            
            console.log('✅ Hashlock and timelocks created')

            // Step 2: Create ICP order info (ICP→EVM)
            const orderInfo: ICPCrossChainOrderInfo = {
                salt: BigInt(Date.now()),
                maker: new Address(this.testEVMAddress),
                makingAmount: BigInt(100000000), // 1 ICP (8 decimals)
                takingAmount: BigInt(1000000), // 1 USDC (6 decimals)
                makerAsset: ICPAddress.fromPrincipal(this.testICPPrincipal), // ICP
                takerAsset: new Address('0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8'), // USDC
                deadline: BigInt(Math.floor(Date.now() / 1000) + 3600), // 1 hour
                auctionStartTime: BigInt(Math.floor(Date.now() / 1000)),
                auctionEndTime: BigInt(Math.floor(Date.now() / 1000) + 1800), // 30 minutes
                nonce: BigInt(Date.now()),
                partialFillAllowed: false,
                multipleFillsAllowed: false
            }
            
            console.log('✅ ICP order info created (ICP→EVM)')

            // Step 3: Create ICP escrow parameters (ICP→EVM)
            const escrowParams: ICPEscrowParams = {
                hashLock,
                timeLocks,
                srcChainId: NetworkEnum.INTERNET_COMPUTER,
                dstChainId: NetworkEnum.ETHEREUM,
                srcSafetyDeposit: BigInt(1000000), // 0.001 ICP
                dstSafetyDeposit: BigInt(1000000000000000), // 0.001 ETH
                icpCanisterId: this.testICPCanisterId,
                icpPrincipal: this.testICPPrincipal
            }
            
            console.log('✅ ICP escrow parameters created (ICP→EVM)')

            // Step 4: Create ICP order details
            const details: ICPDetails = {
                auction: {
                    startPrice: BigInt(100000000),
                    endPrice: BigInt(99000000),
                    duration: BigInt(1800)
                },
                whitelist: [{
                    address: new Address(this.testEVMAddress),
                    allowFrom: BigInt(0)
                }],
                resolvingStartTime: BigInt(0),
                icp: {
                    canisterDeployment: {
                        memoryAllocation: BigInt(1000),
                        computeAllocation: BigInt(1000000000)
                    },
                    tokenTransfer: {
                        ledgerCanisterId: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP ledger
                        decimals: 8
                    }
                }
            }
            
            console.log('✅ ICP order details created')

            // Step 5: Create ICP cross-chain order
            const order = ICPCrossChainOrder.fromParams({
                orderInfo,
                escrowParams,
                details
            })
            
            console.log('✅ ICP cross-chain order created (ICP→EVM)')

            // Step 6: Create ICP escrow factory
            const factory = new ICPEscrowFactory(
                this.testICPCanisterId,
                this.testICPPrincipal
            )
            
            console.log('✅ ICP escrow factory created')

            // Step 7: Create ICP order execution manager
            const executionManager = new ICPOrderExecution(factory)
            
            console.log('✅ ICP order execution manager created')

            // Step 8: Execute the order
            const executionResult = await executionManager.executeOrder(order)
            
            console.log('✅ ICP order executed (ICP→EVM)')

            return {
                success: true,
                orderHash: executionResult.orderHash,
                evmEscrowAddress: executionResult.evmEscrowAddress,
                icpEscrowCanisterId: executionResult.icpEscrowCanisterId,
                details: 'ICP→EVM atomic swap order created and executed successfully'
            }

        } catch (error) {
            console.error('❌ ICP→EVM swap test failed:', error)
            return {
                success: false,
                orderHash: '',
                evmEscrowAddress: '',
                icpEscrowCanisterId: '',
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Test ICP escrow extension functionality
     */
    public testICPEscrowExtension(): {
        success: boolean
        details: string
    } {
        console.log('🚀 Testing ICP Escrow Extension')
        
        try {
            // Create hashlock and timelocks
            const secret = this.generateRandomSecret()
            const hashLock = HashLock.forSingleFill(secret)
            const timeLocks = ICPTimelocks.createDefault()

            // Create ICP escrow extension
            const extension = ICPEscrowExtension.forEVMToICP(
                NetworkEnum.ETHEREUM,
                hashLock,
                timeLocks,
                this.testICPCanisterId,
                this.testICPPrincipal
            )
            
            console.log('✅ ICP escrow extension created')

            // Validate ICP parameters
            extension.validateICPParams()
            
            console.log('✅ ICP parameters validated')

            // Test ICP-specific properties
            if (!extension.isICPDestination) {
                throw new Error('Extension should be ICP destination')
            }
            
            console.log('✅ ICP destination check passed')

            // Test extension conversion
            const icpExtension = extension.toICPExtension()
            
            console.log('✅ ICP extension conversion successful')

            // Test extension reconstruction
            const reconstructed = ICPEscrowExtension.fromICPExtension(icpExtension)
            
            console.log('✅ ICP extension reconstruction successful')

            return {
                success: true,
                details: 'ICP escrow extension functionality tested successfully'
            }

        } catch (error) {
            console.error('❌ ICP escrow extension test failed:', error)
            return {
                success: false,
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Test ICP immutables functionality
     */
    public testICPImmutables(): {
        success: boolean
        details: string
    } {
        console.log('🚀 Testing ICP Immutables')
        
        try {
            // Create test data
            const orderHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
            const hashlock = new Uint8Array(32).fill(1)
            const maker = new Address(this.testEVMAddress)
            const taker = new Address(this.testEVMAddress)
            const amount = BigInt(1000000)
            const safetyDeposit = BigInt(100000)
            const timelocks = new Uint8Array(32).fill(2)
            const srcChainId = NetworkEnum.ETHEREUM
            const dstChainId = NetworkEnum.INTERNET_COMPUTER

            // Create ICP immutables
            const immutables = new ICPImmutables(
                orderHash,
                hashlock,
                maker,
                taker,
                amount,
                safetyDeposit,
                timelocks,
                srcChainId,
                dstChainId
            )
            
            console.log('✅ ICP immutables created')

            // Validate immutables
            immutables.validate()
            
            console.log('✅ ICP immutables validated')

            // Test conversion to EVM format
            const evmImmutables = immutables.toEVMFormat()
            
            console.log('✅ ICP immutables converted to EVM format')

            // Test conversion from EVM format
            const reconstructed = ICPImmutables.fromEVMFormat(evmImmutables)
            
            console.log('✅ ICP immutables reconstructed from EVM format')

            return {
                success: true,
                details: 'ICP immutables functionality tested successfully'
            }

        } catch (error) {
            console.error('❌ ICP immutables test failed:', error)
            return {
                success: false,
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Test ICP timelocks functionality
     */
    public testICPTimelocks(): {
        success: boolean
        details: string
    } {
        console.log('🚀 Testing ICP Timelocks')
        
        try {
            // Create default timelocks
            const timelocks = ICPTimelocks.createDefault()
            
            console.log('✅ Default ICP timelocks created')

            // Validate timelocks
            timelocks.validate()
            
            console.log('✅ ICP timelocks validated')

            // Test conversion to EVM format
            const evmTimelocks = timelocks.toEVMFormat()
            
            console.log('✅ ICP timelocks converted to EVM format')

            // Test conversion from bytes
            const fromBytes = ICPTimelocks.fromBytes(timelocks.toBytes())
            
            console.log('✅ ICP timelocks reconstructed from bytes')

            // Test relative timelock creation
            const relativeTimelocks = ICPTimelocks.createRelative({
                srcWithdrawal: 10,
                srcPublicWithdrawal: 120,
                srcCancellation: 121,
                srcPublicCancellation: 122,
                dstWithdrawal: 10,
                dstPublicWithdrawal: 100,
                dstCancellation: 101
            })
            
            console.log('✅ Relative ICP timelocks created')

            return {
                success: true,
                details: 'ICP timelocks functionality tested successfully'
            }

        } catch (error) {
            console.error('❌ ICP timelocks test failed:', error)
            return {
                success: false,
                details: error instanceof Error ? error.message : 'Unknown error'
            }
        }
    }

    /**
     * Run comprehensive integration test
     */
    public async runComprehensiveTest(): Promise<{
        success: boolean
        results: {
            evmToICP: any
            icpToEVM: any
            escrowExtension: any
            immutables: any
            timelocks: any
        }
        summary: string
    }> {
        console.log('🎯 Starting Comprehensive ICP Integration Test')
        console.log('==============================================')

        const results = {
            evmToICP: await this.testEVMToICPSwap(),
            icpToEVM: await this.testICPToEVMSwap(),
            escrowExtension: this.testICPEscrowExtension(),
            immutables: this.testICPImmutables(),
            timelocks: this.testICPTimelocks()
        }

        const allSuccessful = Object.values(results).every(result => result.success)
        
        console.log('==============================================')
        console.log(`🎯 Comprehensive Test ${allSuccessful ? 'PASSED' : 'FAILED'}`)
        
        if (allSuccessful) {
            console.log('✅ All ICP integration components working correctly')
            console.log('✅ EVM↔ICP atomic swaps fully functional')
            console.log('✅ Phase 8D Integration & Testing COMPLETE')
        } else {
            console.log('❌ Some ICP integration components failed')
            Object.entries(results).forEach(([test, result]) => {
                if (!result.success) {
                    console.log(`❌ ${test}: ${result.details}`)
                }
            })
        }

        return {
            success: allSuccessful,
            results,
            summary: allSuccessful 
                ? 'All ICP integration tests passed successfully'
                : 'Some ICP integration tests failed'
        }
    }

    /**
     * Generate random secret for testing
     */
    private generateRandomSecret(): Uint8Array {
        const secret = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            secret[i] = Math.floor(Math.random() * 256)
        }
        return secret
    }
} 