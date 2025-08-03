#!/usr/bin/env node

/**
 * Deploy 1inch LimitOrderProtocol to Base Sepolia
 * 
 * This script deploys the LimitOrderProtocol contract to Base Sepolia testnet
 * using forge and the correct WETH address for Base Sepolia.
 */

const { spawn } = require('child_process');
const path = require('path');

// Use private key from .env file
require('dotenv').config();

// Base Sepolia WETH address from official Base documentation
const BASE_SEPOLIA_WETH = '0x4200000000000000000000000000000000000006';
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';

console.log('🚀 Deploying 1inch LimitOrderProtocol to Base Sepolia...');
console.log(`📍 WETH Address: ${BASE_SEPOLIA_WETH}`);
console.log(`🌐 RPC: ${BASE_SEPOLIA_RPC}`);

// Path to the LimitOrderProtocol contract
const contractPath = 'contracts/lib/cross-chain-swap/lib/limit-order-protocol/contracts/LimitOrderProtocol.sol:LimitOrderProtocol';

// Get private key from .env file
const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
    console.error('❌ PRIVATE_KEY not found in .env file');
    console.log('Please add PRIVATE_KEY=0x... to your .env file');
    process.exit(1);
}
console.log('🔑 Using private key from .env file');

console.log('\n📝 Contract deployment details:');
console.log(`Contract: ${contractPath}`);
console.log(`Constructor arg: ${BASE_SEPOLIA_WETH}`);

const forgeCommand = [
    'forge', 'create',
    contractPath,
    '--rpc-url', BASE_SEPOLIA_RPC,
    '--private-key', privateKey,
    '--constructor-args', BASE_SEPOLIA_WETH,
    '--broadcast', // Actually deploy to the network
    '--etherscan-api-key', 'dummy', // We'll verify later if needed
    '--verify'
];

console.log('\n⚡ Running forge command...');
console.log(`Command: ${forgeCommand.join(' ')}`);

const forgeProcess = spawn(forgeCommand[0], forgeCommand.slice(1), {
    stdio: 'inherit',
    cwd: process.cwd()
});

forgeProcess.on('close', (code) => {
    if (code === 0) {
        console.log('\n✅ LimitOrderProtocol deployed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Note the deployed contract address');
        console.log('2. Test creating limit orders');
        console.log('3. Deploy helper contracts (SeriesNonceManager, etc.)');
        console.log('4. Deploy test ERC20 tokens (TUSDC, TDAI)');
    } else {
        console.log(`\n❌ Deployment failed with exit code ${code}`);
        console.log('\n🔍 Common issues:');
        console.log('- Network connectivity issues');
        console.log('- Insufficient testnet ETH');
        console.log('- Contract compilation errors');
        console.log('\n💡 Get testnet ETH from Base Sepolia faucet:');
        console.log('https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet');
    }
});

forgeProcess.on('error', (error) => {
    console.error('\n❌ Error running forge command:', error.message);
    console.log('\n💡 Make sure forge is installed and contracts are compiled');
});