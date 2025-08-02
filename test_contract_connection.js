const { ethers } = require('ethers');
require('dotenv').config();

// Configuration
const BASE_SEPOLIA_RPC = 'https://sepolia.base.org';
const LIMIT_ORDER_PROTOCOL_ADDRESS = '0xC8F1403cD1e77eFFF6864bF271a9ED980729524C';

async function testContractConnection() {
    console.log('🔍 Testing Limit Order Protocol Contract Connection...');
    
    try {
        // Setup provider
        const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
        
        // Basic ABI for testing
        const basicABI = [
            'function DOMAIN_SEPARATOR() external view returns(bytes32)',
            'function remainingInvalidatorForOrder(address maker, bytes32 orderHash) external view returns(uint256)',
            'function bitInvalidatorForOrder(address maker, uint256 slot) external view returns(uint256)',
            'function paused() external view returns(bool)',
            'function owner() external view returns(address)'
        ];
        
        // Create contract instance
        const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL_ADDRESS, basicABI, provider);
        
        console.log(`✅ Contract connected: ${LIMIT_ORDER_PROTOCOL_ADDRESS}`);
        
        // Test 1: Get domain separator
        console.log('\n📋 Test 1: Getting Domain Separator...');
        const domainSeparator = await contract.DOMAIN_SEPARATOR();
        console.log(`✅ Domain Separator: ${domainSeparator}`);
        
        // Test 2: Check if contract is paused
        console.log('\n📋 Test 2: Checking if contract is paused...');
        const isPaused = await contract.paused();
        console.log(`📊 Contract paused: ${isPaused}`);
        
        // Test 3: Get contract owner
        console.log('\n📋 Test 3: Getting contract owner...');
        const owner = await contract.owner();
        console.log(`👑 Contract owner: ${owner}`);
        
        // Test 4: Check remaining invalidator for a test order
        console.log('\n📋 Test 4: Checking Remaining Invalidator...');
        const testMaker = '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6'; // Use lowercase address
        const testOrderHash = '0x' + '0'.repeat(64);
        const remaining = await contract.remainingInvalidatorForOrder(testMaker, testOrderHash);
        console.log(`✅ Remaining for test order: ${remaining.toString()}`);
        
        // Test 5: Check bit invalidator
        console.log('\n📋 Test 5: Checking Bit Invalidator...');
        const bitInvalidator = await contract.bitInvalidatorForOrder(testMaker, 0);
        console.log(`✅ Bit invalidator for slot 0: ${bitInvalidator.toString()}`);
        
        console.log('\n🎉 All contract connection tests passed!');
        
    } catch (error) {
        console.error('❌ Contract connection test failed:', error.message);
    }
}

async function testOrderStructure() {
    console.log('\n🔍 Testing Order Structure...');
    
    try {
        const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
        
        // Correct ABI with the actual Order struct from the contract
        const correctABI = [
            'function hashOrder(tuple(uint256 salt, address makerAsset, address takerAsset, address maker, address receiver, address allowedSender, uint256 makingAmount, uint256 takingAmount, bytes makerAssetData, bytes takerAssetData, bytes getMakerAmount, bytes getTakerAmount, bytes predicate, bytes permit, bytes interaction) order) external view returns(bytes32)'
        ];
        
        const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL_ADDRESS, correctABI, provider);
        
        // Create a correct order structure with all required fields
        const order = {
            salt: ethers.BigNumber.from(123456),
            makerAsset: '0x4200000000000000000000000000000000000006', // WETH
            takerAsset: ethers.constants.AddressZero, // ETH
            maker: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6', // Use lowercase address
            receiver: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6', // Use lowercase address
            allowedSender: ethers.constants.AddressZero, // Anyone can fill
            makingAmount: ethers.utils.parseEther('0.001'),
            takingAmount: ethers.utils.parseEther('0.001'),
            makerAssetData: '0x', // No additional data
            takerAssetData: '0x', // No additional data
            getMakerAmount: '0x', // Default calculation
            getTakerAmount: '0x', // Default calculation
            predicate: '0x', // No predicate
            permit: '0x', // No permit
            interaction: '0x' // No interaction
        };
        
        console.log('📦 Testing correct order structure with all fields:');
        console.log(`   Salt: ${order.salt.toString()}`);
        console.log(`   Maker: ${order.maker}`);
        console.log(`   Receiver: ${order.receiver}`);
        console.log(`   Maker Asset: ${order.makerAsset}`);
        console.log(`   Taker Asset: ${order.takerAsset}`);
        console.log(`   Allowed Sender: ${order.allowedSender}`);
        console.log(`   Making Amount: ${order.makingAmount.toString()}`);
        console.log(`   Taking Amount: ${order.takingAmount.toString()}`);
        console.log(`   Maker Asset Data: ${order.makerAssetData}`);
        console.log(`   Taker Asset Data: ${order.takerAssetData}`);
        console.log(`   Get Maker Amount: ${order.getMakerAmount}`);
        console.log(`   Get Taker Amount: ${order.getTakerAmount}`);
        console.log(`   Predicate: ${order.predicate}`);
        console.log(`   Permit: ${order.permit}`);
        console.log(`   Interaction: ${order.interaction}`);
        
        // Try to hash the order
        console.log('\n📋 Attempting to hash order with complete structure...');
        const orderHash = await contract.hashOrder(order);
        console.log(`✅ Order hash: ${orderHash}`);
        
        return orderHash;
        
    } catch (error) {
        console.error('❌ Order structure test failed:', error.message);
        console.error('Error details:', error);
        
        // Try to understand the error better
        if (error.transaction) {
            console.log('\n🔍 Transaction details:');
            console.log(`   To: ${error.transaction.to}`);
            console.log(`   Data: ${error.transaction.data}`);
        }
    }
}

async function testSimpleInteraction() {
    console.log('\n🔍 Testing Simple Contract Interaction...');
    
    try {
        const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
        
        // Try a very simple call to see if the contract responds
        const simpleABI = [
            'function DOMAIN_SEPARATOR() external view returns(bytes32)'
        ];
        
        const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL_ADDRESS, simpleABI, provider);
        
        console.log('📋 Testing simple domain separator call...');
        const domainSeparator = await contract.DOMAIN_SEPARATOR();
        console.log(`✅ Domain separator: ${domainSeparator}`);
        
        console.log('✅ Simple interaction test passed!');
        
    } catch (error) {
        console.error('❌ Simple interaction test failed:', error.message);
    }
}

async function testAvailableFunctions() {
    console.log('\n🔍 Testing Available Functions...');
    
    try {
        const provider = new ethers.providers.JsonRpcProvider(BASE_SEPOLIA_RPC);
        
        // Try different function signatures to see what's available
        const functionTests = [
            {
                name: 'hashOrder with bytes makerTraits',
                abi: ['function hashOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, bytes makerTraits) order) external view returns(bytes32)']
            },
            {
                name: 'hashOrder with uint256 makerTraits',
                abi: ['function hashOrder(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns(bytes32)']
            },
            {
                name: 'hashOrder with separate parameters',
                abi: ['function hashOrder(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) external view returns(bytes32)']
            },
            {
                name: 'getOrderHash',
                abi: ['function getOrderHash(tuple(uint256 salt, address maker, address receiver, address makerAsset, address takerAsset, uint256 makingAmount, uint256 takingAmount, uint256 makerTraits) order) external view returns(bytes32)']
            }
        ];
        
        for (const test of functionTests) {
            try {
                console.log(`\n📋 Testing: ${test.name}`);
                const contract = new ethers.Contract(LIMIT_ORDER_PROTOCOL_ADDRESS, test.abi, provider);
                
                // Create test order
                const order = {
                    salt: ethers.BigNumber.from(123456),
                    maker: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
                    receiver: '0x742d35cc6634c0532925a3b8d4c9db96c4b4d8b6',
                    makerAsset: '0x4200000000000000000000000000000000000006',
                    takerAsset: ethers.constants.AddressZero,
                    makingAmount: ethers.utils.parseEther('0.001'),
                    takingAmount: ethers.utils.parseEther('0.001'),
                    makerTraits: ethers.BigNumber.from(0)
                };
                
                // Try to call the function
                const result = await contract.hashOrder(order);
                console.log(`✅ ${test.name} WORKED! Result: ${result}`);
                return { success: true, function: test.name, result };
                
            } catch (error) {
                console.log(`❌ ${test.name} failed: ${error.message}`);
            }
        }
        
        console.log('\n❌ All function tests failed');
        return { success: false };
        
    } catch (error) {
        console.error('❌ Function testing failed:', error.message);
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('🚀 Testing Limit Order Protocol Contract');
    console.log('========================================');
    
    await testContractConnection();
    await testSimpleInteraction();
    await testAvailableFunctions();
    await testOrderStructure();
}

if (require.main === module) {
    main().catch(console.error);
} 