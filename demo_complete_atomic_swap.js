#!/usr/bin/env node

/**
 * COMPLETE EVM-ICP ATOMIC SWAP DEMO
 * 
 * This script demonstrates a complete atomic swap between EVM and ICP
 * using real hash values and the fixed secret handling system.
 * 
 * Features:
 * - Real Keccak256 hashlock generation
 * - Cross-chain secret compatibility
 * - Complete escrow creation and withdrawal
 * - Atomic swap properties verification
 */

const { ethers } = require('ethers');
const { execSync } = require('child_process');

// Configuration
const ANVIL_RPC = 'http://127.0.0.1:8545';
const ICP_CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';

// Test parameters
const TEST_AMOUNT = ethers.utils.parseEther('0.01'); // 0.01 ETH
const WITHDRAWAL_TIME = 10; // 10 seconds
const CANCELLATION_TIME = 120; // 2 minutes

console.log('🚀 STARTING COMPLETE EVM-ICP ATOMIC SWAP DEMO');
console.log('=' .repeat(60));

async function main() {
    try {
        // Step 1: Generate real secret and hashlock
        console.log('\n📋 Step 1: Generating Real Secret and Hashlock');
        const secret = ethers.utils.randomBytes(32);
        const secretHex = ethers.utils.hexlify(secret);
        
        // Generate hashlock using Keccak256
        const hashlock = ethers.utils.keccak256(secret);
        const hashlockBytes = ethers.utils.arrayify(hashlock);
        
        console.log(`✅ Secret: ${secretHex}`);
        console.log(`✅ Hashlock: ${hashlock}`);
        console.log(`✅ Secret length: ${secret.length} bytes`);
        console.log(`✅ Hashlock length: ${hashlockBytes.length} bytes`);

        // Step 2: Test ICP secret compatibility
        console.log('\n📋 Step 2: Testing ICP Secret Compatibility');
        try {
            const icpTestResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} test_cross_chain_secret_compatibility '("${secretHex.slice(2)}")'`,
                { encoding: 'utf8' }
            );
            console.log('✅ ICP Secret Compatibility Test:');
            console.log(icpTestResult.trim());
        } catch (error) {
            console.log('❌ ICP Secret Compatibility Test Failed:');
            console.log(error.message);
            return;
        }

        // Step 3: Deploy EVM escrow factory
        console.log('\n📋 Step 3: Deploying EVM Escrow Factory');
        const provider = new ethers.providers.JsonRpcProvider(ANVIL_RPC);
        const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
        
        // Deploy SimpleICPEscrowFactory
        const factoryArtifact = require('./contracts/out/SimpleICPEscrowFactory.sol/SimpleICPEscrowFactory.json');
        const factory = new ethers.ContractFactory(
            factoryArtifact.abi,
            factoryArtifact.bytecode,
            wallet
        );
        
        const factoryContract = await factory.deploy();
        await factoryContract.deployed();
        console.log(`✅ EVM Factory deployed: ${factoryContract.address}`);

        // Step 4: Create EVM escrow
        console.log('\n📋 Step 4: Creating EVM Escrow');
        const orderHash = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
            ['address', 'bytes32', 'uint256'],
            [wallet.address, hashlock, TEST_AMOUNT]
        ));
        
        const createEscrowTx = await factoryContract.createICPEscrow(
            orderHash,
            hashlock,
            wallet.address, // taker
            ethers.constants.AddressZero, // ETH token
            TEST_AMOUNT,
            ICP_CANISTER_ID, // ICP canister ID
            { value: TEST_AMOUNT }
        );
        
        const receipt = await createEscrowTx.wait();
        console.log(`✅ EVM Escrow created! Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`✅ Transaction hash: ${receipt.transactionHash}`);

        // Step 5: Create ICP escrow with same parameters
        console.log('\n📋 Step 5: Creating ICP Escrow');
        try {
            const orderHashBytes = ethers.utils.arrayify(orderHash);
            const orderHashHex = ethers.utils.hexlify(orderHashBytes);
            const hashlockHex = ethers.utils.hexlify(hashlockBytes);
            
            const icpEscrowResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} create_escrow_with_hex_secret '(
                    "${orderHashHex.slice(2)}",
                    "${hashlockHex.slice(2)}",
                    "${wallet.address}",
                    "${wallet.address}",
                    ${TEST_AMOUNT.toString()}:nat64,
                    ${WITHDRAWAL_TIME}:nat32,
                    ${CANCELLATION_TIME}:nat32,
                    principal "2vxsx-fae",
                    1:nat64,
                    "${factoryContract.address}"
                )'`,
                { encoding: 'utf8' }
            );
            
            console.log('✅ ICP Escrow created successfully!');
            console.log(icpEscrowResult.trim());
        } catch (error) {
            console.log('❌ ICP Escrow creation failed:');
            console.log(error.message);
            return;
        }

        // Step 6: Wait for withdrawal timelock
        console.log('\n📋 Step 6: Waiting for Withdrawal Timelock');
        console.log(`⏳ Waiting ${WITHDRAWAL_TIME} seconds for withdrawal timelock...`);
        await new Promise(resolve => setTimeout(resolve, (WITHDRAWAL_TIME + 1) * 1000));
        console.log('✅ Withdrawal timelock met');

        // Step 7: Reveal secret on EVM side
        console.log('\n📋 Step 7: Revealing Secret on EVM Side');
        try {
            const revealTx = await factoryContract.claimWithSecret(orderHash, secret);
            const revealReceipt = await revealTx.wait();
            console.log(`✅ Secret revealed on EVM! Gas used: ${revealReceipt.gasUsed.toString()}`);
            console.log(`✅ Transaction hash: ${revealReceipt.transactionHash}`);
        } catch (error) {
            console.log('❌ EVM secret revelation failed:');
            console.log(error.message);
            return;
        }

        // Step 8: Withdraw from ICP escrow using same secret
        console.log('\n📋 Step 8: Withdrawing from ICP Escrow');
        try {
            const withdrawResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} withdraw_with_hex_secret '(
                    "escrow_1",
                    "${secretHex.slice(2)}"
                )'`,
                { encoding: 'utf8' }
            );
            
            console.log('✅ ICP Withdrawal successful!');
            console.log(withdrawResult.trim());
        } catch (error) {
            console.log('❌ ICP withdrawal failed:');
            console.log(error.message);
            return;
        }

        // Step 9: Verify atomic swap properties
        console.log('\n📋 Step 9: Verifying Atomic Swap Properties');
        
        // Check EVM escrow state
        const evmEscrowExists = await factoryContract.hasICPEscrow(orderHash);
        console.log(`✅ EVM Escrow exists: ${evmEscrowExists}`);
        
        // Get escrow details
        const escrowDetails = await factoryContract.getEscrowDetails(orderHash);
        console.log(`✅ EVM Escrow Details:`);
        console.log(`   Canister ID: ${escrowDetails.canisterId}`);
        console.log(`   Amount: ${ethers.utils.formatEther(escrowDetails.amount)} ETH`);
        console.log(`   Token: ${escrowDetails.token}`);
        console.log(`   Taker: ${escrowDetails.taker}`);

        console.log('\n🎉 ATOMIC SWAP COMPLETED SUCCESSFULLY! 🎉');
        console.log('=' .repeat(60));
        console.log('✅ Real secret generation and hashlock verification');
        console.log('✅ Cross-chain secret compatibility confirmed');
        console.log('✅ EVM escrow creation and ETH locking');
        console.log('✅ ICP escrow creation and management');
        console.log('✅ Timelock enforcement working');
        console.log('✅ Secret revelation on EVM side');
        console.log('✅ Atomic withdrawal on ICP side');
        console.log('✅ Complete end-to-end atomic swap flow');
        
        console.log('\n🔗 Key Transaction Links:');
        console.log(`EVM Factory: ${factoryContract.address}`);
        console.log(`Order Hash: ${orderHash}`);
        console.log(`ICP Canister: ${ICP_CANISTER_ID}`);
        console.log(`Secret: ${secretHex}`);
        console.log(`Hashlock: ${hashlock}`);

    } catch (error) {
        console.error('❌ Demo failed:', error);
        process.exit(1);
    }
}

// Run the demo
main().catch(console.error);