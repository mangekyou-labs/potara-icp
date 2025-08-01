const { ethers } = require('hardhat');

/**
 * Deploy ICPEscrowFactory to Base Sepolia
 */
async function main() {
    console.log('🚀 Deploying ICPEscrowFactory to Base Sepolia...\n');

    const [deployer] = await ethers.getSigners();
    console.log('📍 Deploying with account:', deployer.address);
    console.log('💰 Account balance:', ethers.utils.formatEther(await deployer.getBalance()), 'ETH\n');

    // Base Sepolia configuration
    const LIMIT_ORDER_PROTOCOL = '0xC8F1403cD1e77eFFF6864bF271a9ED980729524C'; // Already deployed
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    
    // Mock values for testing (would use real tokens in production)
    const feeToken = ZERO_ADDRESS; // No fee token for testing
    const accessToken = ZERO_ADDRESS; // No access token for testing
    const owner = deployer.address;
    const rescueDelaySrc = 86400; // 24 hours
    const rescueDelayDst = 86400; // 24 hours

    try {
        console.log('📋 Deployment parameters:');
        console.log('  - LimitOrderProtocol:', LIMIT_ORDER_PROTOCOL);
        console.log('  - Fee Token:', feeToken);
        console.log('  - Access Token:', accessToken);
        console.log('  - Owner:', owner);
        console.log('  - Rescue Delay (Src):', rescueDelaySrc);
        console.log('  - Rescue Delay (Dst):', rescueDelayDst);
        console.log();

        // Note: This will fail due to compilation issues
        // But we'll try to isolate the issue
        console.log('⚠️  Note: Attempting deployment despite compilation issues...');
        
        const ICPEscrowFactory = await ethers.getContractFactory('ICPEscrowFactory');
        
        console.log('🔨 Deploying ICPEscrowFactory...');
        const icpEscrowFactory = await ICPEscrowFactory.deploy(
            LIMIT_ORDER_PROTOCOL,
            feeToken,
            accessToken,
            owner,
            rescueDelaySrc,
            rescueDelayDst
        );

        console.log('⏳ Waiting for deployment confirmation...');
        await icpEscrowFactory.deployed();

        console.log('\n✅ ICPEscrowFactory deployed successfully!');
        console.log('📍 Contract address:', icpEscrowFactory.address);
        console.log('🔗 Transaction hash:', icpEscrowFactory.deployTransaction.hash);
        console.log('⛽ Gas used:', icpEscrowFactory.deployTransaction.gasLimit.toString());

        // Test basic functionality
        console.log('\n🧪 Testing basic functionality...');
        
        const icpChainId = await icpEscrowFactory.ICP_CHAIN_ID();
        console.log('📋 ICP Chain ID:', icpChainId.toString());

        const srcImplementation = await icpEscrowFactory.ESCROW_SRC_IMPLEMENTATION();
        const dstImplementation = await icpEscrowFactory.ESCROW_DST_IMPLEMENTATION();
        console.log('🏗️  Source Implementation:', srcImplementation);
        console.log('🏗️  Destination Implementation:', dstImplementation);

        console.log('\n🎉 ICPEscrowFactory deployment and testing complete!');
        console.log('🔍 View on Base Sepolia explorer:');
        console.log(`   https://sepolia.basescan.org/address/${icpEscrowFactory.address}`);

        // Save deployment info
        const deploymentInfo = {
            contractAddress: icpEscrowFactory.address,
            transactionHash: icpEscrowFactory.deployTransaction.hash,
            network: 'Base Sepolia',
            chainId: 84532,
            icpChainId: icpChainId.toString(),
            limitOrderProtocol: LIMIT_ORDER_PROTOCOL,
            srcImplementation: srcImplementation,
            dstImplementation: dstImplementation,
            deployedAt: new Date().toISOString()
        };

        console.log('\n💾 Deployment info saved to icp-escrow-factory-deployment.json');
        require('fs').writeFileSync(
            'icp-escrow-factory-deployment.json',
            JSON.stringify(deploymentInfo, null, 2)
        );

        return deploymentInfo;

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        
        if (error.message.includes('compilation')) {
            console.log('\n🔧 Suggested fixes for compilation issues:');
            console.log('1. Update SafeERC20 imports in BaseEscrow.sol');
            console.log('2. Fix inheritance conflicts in ICPEscrowFactory.sol');
            console.log('3. Ensure all dependencies are properly imported');
        }
        
        throw error;
    }
}

// Export for programmatic use
module.exports = { main };

// Run if called directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}