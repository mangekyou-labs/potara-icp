#!/usr/bin/env node

/**
 * Deploy real 1inch LimitOrderProtocol using compiled artifact
 */

const { ethers } = require('ethers');
const fs = require('fs');
require('dotenv').config();

async function main() {
    console.log('🚀 Deploying 1inch LimitOrderProtocol to Base Sepolia...');
    
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(process.env.BASE_SEPOLIA_RPC);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log(`📍 Deployer address: ${wallet.address}`);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
    
    if (balance === 0n) {
        console.error('❌ Insufficient balance. Need testnet ETH.');
        process.exit(1);
    }
    
    // Base Sepolia WETH address
    const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
    console.log(`📍 WETH Address: ${WETH_ADDRESS}`);
    
    // Load contract artifact
    const artifact = JSON.parse(fs.readFileSync('./dist/contracts/LimitOrderProtocol.sol/LimitOrderProtocol.json', 'utf8'));
    
    console.log('📦 Loaded contract artifact');
    console.log(`📋 Contract has ${artifact.abi.length} ABI functions`);
    
    // Create contract factory
    const contractFactory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode.object,
        wallet
    );
    
    console.log('🔧 Deploying contract...');
    
    try {
        // Deploy the contract with WETH address as constructor argument
        const contract = await contractFactory.deploy(WETH_ADDRESS, {
            gasLimit: 5000000, // 5M gas limit to be safe
        });
        
        console.log(`🚀 Contract deployment transaction sent: ${contract.deploymentTransaction().hash}`);
        console.log('⏳ Waiting for deployment confirmation...');
        
        // Wait for deployment
        await contract.waitForDeployment();
        
        const contractAddress = await contract.getAddress();
        
        console.log('\n✅ 🎉 DEPLOYMENT SUCCESSFUL! 🎉');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📍 Contract Address: ${contractAddress}`);
        console.log(`🔗 Transaction Hash: ${contract.deploymentTransaction().hash}`);
        console.log(`🌐 Explorer: https://sepolia.basescan.org/address/${contractAddress}`);
        console.log(`🔗 Tx Explorer: https://sepolia.basescan.org/tx/${contract.deploymentTransaction().hash}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        // Test basic contract interaction
        try {
            const owner = await contract.owner();
            console.log(`👑 Contract Owner: ${owner}`);
            
            const wethAddr = WETH_ADDRESS; // We know this from constructor
            console.log(`💎 WETH Token: ${wethAddr}`);
            
            console.log('\n🧪 Contract interaction test successful!');
        } catch (e) {
            console.log('⚠️  Contract deployed but interaction test failed:', e.message);
        }
        
        console.log('\n📋 Next steps:');
        console.log('1. ✅ LimitOrderProtocol deployed successfully');
        console.log('2. 🔄 Task 2: Deploy Modified EscrowFactory');
        console.log('3. 🏗️  Deploy test ERC20 tokens (TUSDC, TDAI)');
        console.log('4. 🧪 Test creating limit orders');
        
        // Save deployment info
        const deploymentInfo = {
            network: 'Base Sepolia',
            contractName: 'LimitOrderProtocol',
            address: contractAddress,
            deployer: wallet.address,
            transactionHash: contract.deploymentTransaction().hash,
            blockNumber: (await contract.deploymentTransaction().wait()).blockNumber,
            wethAddress: WETH_ADDRESS,
            timestamp: new Date().toISOString(),
            constructorArgs: [WETH_ADDRESS]
        };
        
        fs.writeFileSync('limitorderprotocol-deployment.json', JSON.stringify(deploymentInfo, null, 2));
        console.log('💾 Deployment info saved to limitorderprotocol-deployment.json');
        
        return {
            success: true,
            address: contractAddress,
            txHash: contract.deploymentTransaction().hash
        };
        
    } catch (error) {
        console.error('\n❌ Deployment failed:');
        console.error('Error:', error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            console.error('💰 Need more testnet ETH. Get from: https://faucets.chain.link/base-sepolia');
        }
        
        process.exit(1);
    }
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = main;