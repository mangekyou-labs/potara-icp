#!/usr/bin/env node

/**
 * Test Limit Order Protocol Access on Base Sepolia
 */

require('dotenv').config();
const { ethers } = require('ethers');

const BASE_SEPOLIA_LOP_ADDRESS = '0xC8F1403cD1e77eFFF6864bF271a9ED980729524C';
const BASE_SEPOLIA_WETH = '0x4200000000000000000000000000000000000006';

async function main() {
    console.log('🔍 TESTING LIMIT ORDER PROTOCOL ACCESS ON BASE SEPOLIA');
    console.log('=====================================================\n');

    // Test different RPC endpoints
    const rpcEndpoints = [
        { name: 'Alchemy (from .env)', url: process.env.BASE_SEPOLIA_RPC },
        { name: 'Public Base Sepolia', url: 'https://sepolia.base.org' },
        { name: 'Ankr Base Sepolia', url: 'https://rpc.ankr.com/base_sepolia' }
    ];

    for (const rpc of rpcEndpoints) {
        console.log(`\n🔧 Testing ${rpc.name}:`);
        console.log(`   RPC: ${rpc.url}`);
        
        try {
            const provider = new ethers.providers.JsonRpcProvider(rpc.url);
            
            // Test basic connection
            const blockNumber = await provider.getBlockNumber();
            console.log(`   ✅ Connected! Block number: ${blockNumber}`);
            
            // Test contract access
            const lopContract = new ethers.Contract(
                BASE_SEPOLIA_LOP_ADDRESS,
                [
                    'function owner() external view returns (address)',
                    'function paused() external view returns (bool)',
                    'function DOMAIN_SEPARATOR() external view returns(bytes32)'
                ],
                provider
            );
            
            try {
                const owner = await lopContract.owner();
                console.log(`   ✅ owner() call successful: ${owner}`);
                console.log(`   ✅ Expected owner: 0x7A23f6457A23A7A9D8a0dDab0b85d94123E53389`);
                console.log(`   ✅ Match: ${owner === '0x7A23f6457A23A7A9D8a0dDab0b85d94123E53389' ? 'YES' : 'NO'}`);
                
                try {
                    const paused = await lopContract.paused();
                    console.log(`   ✅ paused() call successful: ${paused}`);
                } catch (e) {
                    console.log(`   ⚠️  paused() call failed: ${e.message}`);
                }
                
                try {
                    const domainSeparator = await lopContract.DOMAIN_SEPARATOR();
                    console.log(`   ✅ DOMAIN_SEPARATOR() call successful: ${domainSeparator}`);
                } catch (e) {
                    console.log(`   ⚠️  DOMAIN_SEPARATOR() call failed: ${e.message}`);
                }
                
            } catch (e) {
                console.log(`   ❌ Contract call failed: ${e.message}`);
            }
            
        } catch (e) {
            console.log(`   ❌ Connection failed: ${e.message}`);
        }
    }

    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log(`📍 Contract Address: ${BASE_SEPOLIA_LOP_ADDRESS}`);
    console.log(`📍 Expected WETH: ${BASE_SEPOLIA_WETH}`);
    console.log(`📍 Deployer: 0x7A23f6457A23A7A9D8a0dDab0b85d94123E53389`);
    console.log(`📍 Transaction: 0x1209e94d7ee669f6913436f4af323872a3cbc71066d724182518822298f7ffcd`);
}

if (require.main === module) {
    main().catch(console.error);
} 