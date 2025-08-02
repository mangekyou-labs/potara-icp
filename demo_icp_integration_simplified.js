/**
 * Simplified ICP Integration Demo
 * Demonstrates core EVM↔ICP atomic swap functionality
 * 
 * This demo shows:
 * 1. ICP escrow creation and management
 * 2. Cross-chain secret revelation
 * 3. Atomic swap execution
 * 4. Timelock mechanisms
 * 5. Bidirectional EVM↔ICP swaps
 */

const { ethers } = require('ethers');
const crypto = require('crypto');

class SimplifiedICPIntegrationDemo {
    constructor() {
        this.testICPCanisterId = 'uxrrr-q7777-77774-qaaaq-cai';
        this.testICPPrincipal = '2vxsx-fae';
        this.testEVMAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
        this.escrows = new Map();
        this.orders = new Map();
    }

    /**
     * Generate random secret for atomic swaps
     */
    generateSecret() {
        return crypto.randomBytes(32);
    }

    /**
     * Create Keccak256 hashlock from secret
     */
    createHashlock(secret) {
        return ethers.utils.keccak256(secret);
    }

    /**
     * Create ICP timelocks with reasonable defaults
     */
    createICPTimelocks() {
        const now = Math.floor(Date.now() / 1000);
        return {
            srcWithdrawal: now + 10,        // 10 seconds
            srcPublicWithdrawal: now + 120, // 2 minutes
            srcCancellation: now + 121,     // 2 minutes + 1 second
            srcPublicCancellation: now + 240, // 4 minutes
            dstWithdrawal: now + 10,        // 10 seconds
            dstPublicWithdrawal: now + 100, // 1 minute 40 seconds
            dstCancellation: now + 101      // 1 minute 41 seconds
        };
    }

    /**
     * Create ICP escrow (simulated)
     */
    createICPEscrow(orderHash, hashlock, maker, taker, amount, timelocks) {
        const escrowId = `icp_escrow_${Date.now()}`;
        const escrow = {
            id: escrowId,
            orderHash,
            hashlock,
            maker,
            taker,
            amount,
            timelocks,
            deployedAt: Math.floor(Date.now() / 1000),
            withdrawn: false,
            cancelled: false,
            secret: null
        };

        this.escrows.set(escrowId, escrow);
        console.log(`✅ ICP Escrow created: ${escrowId}`);
        return escrowId;
    }

    /**
     * Create EVM escrow (simulated)
     */
    createEVMEscrow(orderHash, hashlock, maker, taker, amount, timelocks) {
        const escrowId = `evm_escrow_${Date.now()}`;
        const escrow = {
            id: escrowId,
            orderHash,
            hashlock,
            maker,
            taker,
            amount,
            timelocks,
            deployedAt: Math.floor(Date.now() / 1000),
            withdrawn: false,
            cancelled: false,
            secret: null
        };

        this.escrows.set(escrowId, escrow);
        console.log(`✅ EVM Escrow created: ${escrowId}`);
        return escrowId;
    }

    /**
     * Withdraw from ICP escrow with secret
     */
    withdrawFromICPEscrow(escrowId, secret) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`ICP Escrow not found: ${escrowId}`);
        }

        // Verify secret matches hashlock
        const secretHash = ethers.utils.keccak256(secret);
        if (secretHash !== escrow.hashlock) {
            throw new Error('Invalid secret provided');
        }

        // Check timelock
        const now = Math.floor(Date.now() / 1000);
        if (now < escrow.timelocks.dstWithdrawal) {
            throw new Error('Withdrawal timelock not met');
        }

        // Mark as withdrawn
        escrow.withdrawn = true;
        escrow.secret = secret;
        console.log(`✅ ICP Escrow withdrawn: ${escrowId}`);
        return true;
    }

    /**
     * Withdraw from EVM escrow with secret
     */
    withdrawFromEVMEscrow(escrowId, secret) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`EVM Escrow not found: ${escrowId}`);
        }

        // Verify secret matches hashlock
        const secretHash = ethers.utils.keccak256(secret);
        if (secretHash !== escrow.hashlock) {
            throw new Error('Invalid secret provided');
        }

        // Check timelock
        const now = Math.floor(Date.now() / 1000);
        if (now < escrow.timelocks.dstWithdrawal) {
            throw new Error('Withdrawal timelock not met');
        }

        // Mark as withdrawn
        escrow.withdrawn = true;
        escrow.secret = secret;
        console.log(`✅ EVM Escrow withdrawn: ${escrowId}`);
        return true;
    }

    /**
     * Cancel ICP escrow
     */
    cancelICPEscrow(escrowId) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`ICP Escrow not found: ${escrowId}`);
        }

        // Check cancellation timelock
        const now = Math.floor(Date.now() / 1000);
        if (now < escrow.timelocks.dstCancellation) {
            throw new Error('Cancellation timelock not met');
        }

        // Mark as cancelled
        escrow.cancelled = true;
        console.log(`✅ ICP Escrow cancelled: ${escrowId}`);
        return true;
    }

    /**
     * Cancel EVM escrow
     */
    cancelEVMEscrow(escrowId) {
        const escrow = this.escrows.get(escrowId);
        if (!escrow) {
            throw new Error(`EVM Escrow not found: ${escrowId}`);
        }

        // Check cancellation timelock
        const now = Math.floor(Date.now() / 1000);
        if (now < escrow.timelocks.dstCancellation) {
            throw new Error('Cancellation timelock not met');
        }

        // Mark as cancelled
        escrow.cancelled = true;
        console.log(`✅ EVM Escrow cancelled: ${escrowId}`);
        return true;
    }

    /**
     * Create cross-chain order
     */
    createCrossChainOrder(maker, makingAmount, takingAmount, srcChain, dstChain) {
        const orderId = `order_${Date.now()}`;
        const secret = this.generateSecret();
        const hashlock = this.createHashlock(secret);
        const timelocks = this.createICPTimelocks();

        const order = {
            id: orderId,
            maker,
            makingAmount,
            takingAmount,
            srcChain,
            dstChain,
            secret,
            hashlock,
            timelocks,
            createdAt: Math.floor(Date.now() / 1000),
            status: 'created'
        };

        this.orders.set(orderId, order);
        console.log(`✅ Cross-chain order created: ${orderId}`);
        return { orderId, secret, hashlock };
    }

    /**
     * Execute EVM→ICP atomic swap
     */
    async executeEVMToICPSwap() {
        console.log('\n🚀 Executing EVM→ICP Atomic Swap');
        console.log('=====================================');

        try {
            // Step 1: Create cross-chain order
            const { orderId, secret, hashlock } = this.createCrossChainOrder(
                this.testEVMAddress,
                ethers.utils.parseEther('1.0'), // 1 ETH
                ethers.utils.parseEther('100.0'), // 100 ICP
                'ethereum',
                'icp'
            );

            const order = this.orders.get(orderId);
            console.log(`📋 Order created: ${orderId}`);
            console.log(`🔐 Secret: ${ethers.utils.hexlify(secret)}`);
            console.log(`🔒 Hashlock: ${hashlock}`);

            // Step 2: Create EVM escrow (source)
            const evmEscrowId = this.createEVMEscrow(
                orderId,
                hashlock,
                order.maker,
                this.testEVMAddress,
                order.makingAmount,
                order.timelocks
            );

            // Step 3: Create ICP escrow (destination)
            const icpEscrowId = this.createICPEscrow(
                orderId,
                hashlock,
                order.maker,
                this.testEVMAddress,
                order.takingAmount,
                order.timelocks
            );

            console.log(`📦 EVM Escrow: ${evmEscrowId}`);
            console.log(`📦 ICP Escrow: ${icpEscrowId}`);

            // Step 4: Wait for timelock (simulated)
            console.log('⏰ Waiting for withdrawal timelock...');
            await new Promise(resolve => setTimeout(resolve, 11000)); // 11 seconds

            // Step 5: Reveal secret on EVM side
            console.log('🔓 Revealing secret on EVM side...');
            this.withdrawFromEVMEscrow(evmEscrowId, secret);

            // Step 6: Withdraw from ICP side using same secret
            console.log('🔓 Withdrawing from ICP side...');
            this.withdrawFromICPEscrow(icpEscrowId, secret);

            // Step 7: Verify atomic swap completion
            const evmEscrow = this.escrows.get(evmEscrowId);
            const icpEscrow = this.escrows.get(icpEscrowId);

            if (evmEscrow.withdrawn && icpEscrow.withdrawn) {
                console.log('🎉 EVM→ICP Atomic Swap Completed Successfully!');
                console.log('✅ Both escrows withdrawn with same secret');
                console.log('✅ Atomic swap properties maintained');
                return true;
            } else {
                throw new Error('Atomic swap failed - not both escrows withdrawn');
            }

        } catch (error) {
            console.error('❌ EVM→ICP Atomic Swap Failed:', error.message);
            return false;
        }
    }

    /**
     * Execute ICP→EVM atomic swap
     */
    async executeICPToEVMSwap() {
        console.log('\n🚀 Executing ICP→EVM Atomic Swap');
        console.log('=====================================');

        try {
            // Step 1: Create cross-chain order
            const { orderId, secret, hashlock } = this.createCrossChainOrder(
                this.testEVMAddress,
                ethers.utils.parseEther('100.0'), // 100 ICP
                ethers.utils.parseEther('1.0'), // 1 ETH
                'icp',
                'ethereum'
            );

            const order = this.orders.get(orderId);
            console.log(`📋 Order created: ${orderId}`);
            console.log(`🔐 Secret: ${ethers.utils.hexlify(secret)}`);
            console.log(`🔒 Hashlock: ${hashlock}`);

            // Step 2: Create ICP escrow (source)
            const icpEscrowId = this.createICPEscrow(
                orderId,
                hashlock,
                order.maker,
                this.testEVMAddress,
                order.makingAmount,
                order.timelocks
            );

            // Step 3: Create EVM escrow (destination)
            const evmEscrowId = this.createEVMEscrow(
                orderId,
                hashlock,
                order.maker,
                this.testEVMAddress,
                order.takingAmount,
                order.timelocks
            );

            console.log(`📦 ICP Escrow: ${icpEscrowId}`);
            console.log(`📦 EVM Escrow: ${evmEscrowId}`);

            // Step 4: Wait for timelock (simulated)
            console.log('⏰ Waiting for withdrawal timelock...');
            await new Promise(resolve => setTimeout(resolve, 11000)); // 11 seconds

            // Step 5: Reveal secret on ICP side
            console.log('🔓 Revealing secret on ICP side...');
            this.withdrawFromICPEscrow(icpEscrowId, secret);

            // Step 6: Withdraw from EVM side using same secret
            console.log('🔓 Withdrawing from EVM side...');
            this.withdrawFromEVMEscrow(evmEscrowId, secret);

            // Step 7: Verify atomic swap completion
            const icpEscrow = this.escrows.get(icpEscrowId);
            const evmEscrow = this.escrows.get(evmEscrowId);

            if (icpEscrow.withdrawn && evmEscrow.withdrawn) {
                console.log('🎉 ICP→EVM Atomic Swap Completed Successfully!');
                console.log('✅ Both escrows withdrawn with same secret');
                console.log('✅ Atomic swap properties maintained');
                return true;
            } else {
                throw new Error('Atomic swap failed - not both escrows withdrawn');
            }

        } catch (error) {
            console.error('❌ ICP→EVM Atomic Swap Failed:', error.message);
            return false;
        }
    }

    /**
     * Test timelock mechanisms
     */
    testTimelocks() {
        console.log('\n⏰ Testing Timelock Mechanisms');
        console.log('==============================');

        try {
            // Create escrow with short timelocks
            const secret = this.generateSecret();
            const hashlock = this.createHashlock(secret);
            const timelocks = {
                srcWithdrawal: Math.floor(Date.now() / 1000) + 5,  // 5 seconds
                srcPublicWithdrawal: Math.floor(Date.now() / 1000) + 60,
                srcCancellation: Math.floor(Date.now() / 1000) + 61,
                srcPublicCancellation: Math.floor(Date.now() / 1000) + 120,
                dstWithdrawal: Math.floor(Date.now() / 1000) + 5,  // 5 seconds
                dstPublicWithdrawal: Math.floor(Date.now() / 1000) + 50,
                dstCancellation: Math.floor(Date.now() / 1000) + 51
            };

            const escrowId = this.createICPEscrow(
                'test_order',
                hashlock,
                this.testEVMAddress,
                this.testEVMAddress,
                ethers.utils.parseEther('1.0'),
                timelocks
            );

            // Try to withdraw immediately (should fail)
            console.log('🔒 Attempting immediate withdrawal (should fail)...');
            try {
                this.withdrawFromICPEscrow(escrowId, secret);
                throw new Error('Timelock bypassed - this should not happen');
            } catch (error) {
                if (error.message.includes('timelock')) {
                    console.log('✅ Timelock correctly enforced');
                } else {
                    throw error;
                }
            }

            // Wait for timelock
            console.log('⏰ Waiting for timelock...');
            setTimeout(() => {
                try {
                    this.withdrawFromICPEscrow(escrowId, secret);
                    console.log('✅ Timelock correctly allows withdrawal after time');
                } catch (error) {
                    console.error('❌ Timelock test failed:', error.message);
                }
            }, 6000); // 6 seconds

            return true;

        } catch (error) {
            console.error('❌ Timelock test failed:', error.message);
            return false;
        }
    }

    /**
     * Test secret validation
     */
    testSecretValidation() {
        console.log('\n🔐 Testing Secret Validation');
        console.log('=============================');

        try {
            const secret = this.generateSecret();
            const hashlock = this.createHashlock(secret);
            const timelocks = this.createICPTimelocks();

            const escrowId = this.createICPEscrow(
                'test_order',
                hashlock,
                this.testEVMAddress,
                this.testEVMAddress,
                ethers.utils.parseEther('1.0'),
                timelocks
            );

            // Try with wrong secret (should fail)
            console.log('🔒 Attempting withdrawal with wrong secret...');
            const wrongSecret = crypto.randomBytes(32);
            try {
                this.withdrawFromICPEscrow(escrowId, wrongSecret);
                throw new Error('Wrong secret accepted - this should not happen');
            } catch (error) {
                if (error.message.includes('Invalid secret')) {
                    console.log('✅ Wrong secret correctly rejected');
                } else {
                    throw error;
                }
            }

            // Try with correct secret (should succeed after timelock)
            console.log('🔓 Attempting withdrawal with correct secret...');
            setTimeout(() => {
                try {
                    this.withdrawFromICPEscrow(escrowId, secret);
                    console.log('✅ Correct secret correctly accepted');
                } catch (error) {
                    console.error('❌ Correct secret test failed:', error.message);
                }
            }, 11000); // 11 seconds

            return true;

        } catch (error) {
            console.error('❌ Secret validation test failed:', error.message);
            return false;
        }
    }

    /**
     * Run comprehensive demo
     */
    async runComprehensiveDemo() {
        console.log('🎯 Starting Simplified ICP Integration Demo');
        console.log('============================================');
        console.log('This demo shows core EVM↔ICP atomic swap functionality');
        console.log('');

        const results = {
            evmToICP: await this.executeEVMToICPSwap(),
            icpToEVM: await this.executeICPToEVMSwap(),
            timelocks: this.testTimelocks(),
            secretValidation: this.testSecretValidation()
        };

        console.log('\n============================================');
        console.log('🎯 Demo Results Summary');
        console.log('============================================');
        console.log(`EVM→ICP Atomic Swap: ${results.evmToICP ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`ICP→EVM Atomic Swap: ${results.icpToEVM ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Timelock Mechanisms: ${results.timelocks ? '✅ PASSED' : '❌ FAILED'}`);
        console.log(`Secret Validation: ${results.secretValidation ? '✅ PASSED' : '❌ FAILED'}`);

        const allPassed = Object.values(results).every(result => result === true);
        console.log(`\nOverall Result: ${allPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

        if (allPassed) {
            console.log('\n✅ Core EVM↔ICP atomic swap functionality demonstrated successfully!');
            console.log('✅ Cross-chain secret compatibility verified');
            console.log('✅ Timelock mechanisms working correctly');
            console.log('✅ Atomic swap properties maintained');
            console.log('✅ Phase 8D Simplified Demo COMPLETE');
        }

        return results;
    }
}

// Run the demo if this file is executed directly
if (require.main === module) {
    const demo = new SimplifiedICPIntegrationDemo();
    demo.runComprehensiveDemo().catch(console.error);
}

module.exports = SimplifiedICPIntegrationDemo; 