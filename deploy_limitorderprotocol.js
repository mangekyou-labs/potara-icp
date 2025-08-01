#!/usr/bin/env node

/**
 * Deploy 1inch LimitOrderProtocol using ethers.js directly
 */

const { ethers } = require('ethers');
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
    
    // Contract ABI (just constructor for deployment)
    const abi = [
        "constructor(address _weth)"
    ];
    
    // Bytecode from forge inspect (truncated for readability)
    const bytecode = "0x6101a03462000276576001600160401b0390601f62005ce938819003918201601f1916830192919084841183851017620002625781602092849260409687528339810103126200027657516001600160a01b03918282169081830362000276578051906200006d826200027a565b601a82526020820190..."; // Full bytecode would be here
    
    console.log('❌ This approach requires the full bytecode. Let me try a different method...');
    
    // Alternative: Use forge directly in a subprocess
    const { spawn } = require('child_process');
    
    console.log('🔧 Trying direct forge deployment...');
    
    const forgeArgs = [
        'create',
        'contracts/lib/cross-chain-swap/lib/limit-order-protocol/contracts/LimitOrderProtocol.sol:LimitOrderProtocol',
        '--constructor-args', WETH_ADDRESS,
        '--private-key', process.env.PRIVATE_KEY,
        '--rpc-url', process.env.BASE_SEPOLIA_RPC,
        '--broadcast',
        '--verify',
        '--etherscan-api-key', 'dummy'
    ];
    
    console.log(`Command: forge ${forgeArgs.join(' ')}`);
    
    const forge = spawn('forge', forgeArgs, {
        stdio: 'inherit',
        env: { ...process.env }
    });
    
    forge.on('close', (code) => {
        if (code === 0) {
            console.log('\n✅ LimitOrderProtocol deployed successfully!');
        } else {
            console.log(`\n❌ Deployment failed with exit code ${code}`);
        }
    });
    
    forge.on('error', (error) => {
        console.error('\n❌ Error running forge:', error.message);
    });
}

main().catch(console.error);