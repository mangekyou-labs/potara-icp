#!/usr/bin/env node

/**
 * BASE SEPOLIA TESTNET VALIDATION SCRIPT
 * 
 * This script helps validate the "onchain execution of token transfers on testnet" 
 * qualification requirement by testing on Base Sepolia testnet.
 * 
 * Prerequisites:
 * 1. Get Base Sepolia testnet ETH from faucet: https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
 * 2. Set your private key: export BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
 * 3. Make sure you have at least 0.01 ETH for gas fees
 */

require('dotenv').config();
const { ethers } = require('ethers');
const { execSync } = require('child_process');

// Configuration
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_LOP_ADDRESS = '0xC8F1403cD1e77eFFF6864bF271a9ED980729524C';

async function main() {
    console.log('🌐 BASE SEPOLIA TESTNET VALIDATION');
    console.log('===================================\n');

    // Check if private key is set
    const privateKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;
    if (!privateKey) {
        console.log('❌ BASE_SEPOLIA_PRIVATE_KEY not found in environment');
        console.log('\n📋 SETUP INSTRUCTIONS:');
        console.log('1. Get Base Sepolia testnet ETH from faucet:');
        console.log('   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
        console.log('2. Set your private key:');
        console.log('   export BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here');
        console.log('3. Make sure you have at least 0.01 ETH for gas fees');
        console.log('4. Run this script again');
        return;
    }

    // Connect to Base Sepolia
    const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    console.log('✅ Connected to Base Sepolia testnet');
    console.log(`📍 Wallet Address: ${wallet.address}`);
    console.log(`🌐 Network: Base Sepolia (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`);

    // Check balance
    const balance = await wallet.getBalance();
    console.log(`💰 Balance: ${ethers.utils.formatEther(balance)} ETH`);

    if (balance.lt(ethers.utils.parseEther('0.01'))) {
        console.log('\n❌ Insufficient balance for testing');
        console.log('   Please get more ETH from the faucet:');
        console.log('   https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
        return;
    }

    // Validate Limit Order Protocol deployment
    console.log('\n🔍 Validating Limit Order Protocol Deployment');
    try {
        const lopContract = new ethers.Contract(
            BASE_SEPOLIA_LOP_ADDRESS,
            ['function WETH() external view returns (address)'],
            provider
        );
        
        const wethAddress = await lopContract.WETH();
        console.log('✅ Limit Order Protocol deployed on Base Sepolia');
        console.log(`   Contract Address: ${BASE_SEPOLIA_LOP_ADDRESS}`);
        console.log(`   WETH Address: ${wethAddress}`);
        console.log(`   Network: Base Sepolia (Chain ID: ${BASE_SEPOLIA_CHAIN_ID})`);
    } catch (error) {
        console.log('❌ Limit Order Protocol validation failed:', error.message);
        return;
    }

    console.log('\n🎯 READY FOR BASE SEPOLIA TESTING!');
    console.log('===================================');
    console.log('✅ Private key configured');
    console.log('✅ Sufficient balance for gas fees');
    console.log('✅ Limit Order Protocol validated');
    console.log('\n🚀 Now run the comprehensive validation:');
    console.log('   node demo_comprehensive_validation.js');
    console.log('\n📋 This will properly validate:');
    console.log('   ✅ Onchain execution of token transfers on testnet');
    console.log('   ✅ Real testnet deployment and transactions');
    console.log('   ✅ Gas costs and network interactions');
}

if (require.main === module) {
    main().catch(console.error);
} 