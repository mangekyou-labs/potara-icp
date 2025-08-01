#!/usr/bin/env node

/**
 * Component Verification Script for EVM-ICP Atomic Swap Demo
 * 
 * This script verifies that all components are working correctly before
 * running the full atomic swap demo.
 */

const { ethers } = require('hardhat');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ComponentVerifier {
    constructor() {
        this.results = {
            evmContracts: false,
            icpCanister: false,
            hashCompatibility: false,
            tokenSupport: false
        };
    }

    log(message) {
        console.log(`🔍 [VERIFY] ${message}`);
    }

    success(message) {
        console.log(`✅ [PASS] ${message}`);
    }

    error(message) {
        console.error(`❌ [FAIL] ${message}`);
    }

    // Test 1: EVM Contracts Compilation and Deployment
    async testEVMContracts() {
        this.log('Testing EVM contracts compilation and deployment...');
        
        try {
            // Get signers
            const [deployer] = await ethers.getSigners();
            this.log(`Using deployer address: ${deployer.address}`);
            
            // Deploy MockERC20
            const MockERC20 = await ethers.getContractFactory('MockERC20');
            const mockToken = await MockERC20.deploy(
                'Test Token',
                'TEST',
                18,
                ethers.parseUnits('1000', 18)
            );
            await mockToken.waitForDeployment();
            this.success(`MockERC20 deployed at: ${await mockToken.getAddress()}`);
            
            // Deploy TestEscrowMinimal
            const TestEscrow = await ethers.getContractFactory('TestEscrowMinimal');
            const escrow = await TestEscrow.deploy();
            await escrow.waitForDeployment();
            this.success(`TestEscrowMinimal deployed at: ${await escrow.getAddress()}`);
            
            // Test basic functionality
            const secret = crypto.randomBytes(32);
            const hashlock = await escrow.generateHashlock(secret);
            this.success(`Hashlock generation working: ${hashlock}`);
            
            this.results.evmContracts = true;
            return { mockToken, escrow };
            
        } catch (error) {
            this.error(`EVM contracts test failed: ${error.message}`);
            this.results.evmContracts = false;
            throw error;
        }
    }

    // Test 2: ICP Canister Deployment and Basic Functions
    async testICPCanister() {
        this.log('Testing ICP canister deployment and basic functions...');
        
        try {
            // Check if dfx is available
            try {
                execSync('dfx --version', { stdio: 'pipe' });
                this.success('dfx CLI available');
            } catch (error) {
                this.error('dfx CLI not available - please install Internet Computer SDK');
                this.results.icpCanister = false;
                return false;
            }
            
            // Check if local replica is running
            try {
                execSync('dfx ping', { cwd: './icp_escrow', stdio: 'pipe' });
                this.success('ICP local replica is running');
            } catch (error) {
                this.error('ICP local replica not running - please start with "dfx start"');
                this.results.icpCanister = false;
                return false;
            }
            
            // Deploy canister
            this.log('Deploying ICP canister...');
            const deployOutput = execSync('dfx deploy icp_escrow_backend', {
                cwd: './icp_escrow',
                encoding: 'utf-8'
            });
            
            // Get canister ID
            const canisterIdOutput = execSync('dfx canister id icp_escrow_backend', {
                cwd: './icp_escrow',
                encoding: 'utf-8'
            }).trim();
            this.success(`ICP canister deployed with ID: ${canisterIdOutput}`);
            
            // Test basic canister function
            this.log('Testing basic canister functions...');
            const testCmd = `dfx canister call icp_escrow_backend create_test_hashlock '(vec { 1; 2; 3; 4 })'`;
            const testOutput = execSync(testCmd, {
                cwd: './icp_escrow',
                encoding: 'utf-8'
            });
            this.success('Basic canister function test passed');
            
            this.results.icpCanister = true;
            return canisterIdOutput;
            
        } catch (error) {
            this.error(`ICP canister test failed: ${error.message}`);
            this.results.icpCanister = false;
            throw error;
        }
    }

    // Test 3: Hash Compatibility Between EVM and ICP
    async testHashCompatibility(escrow) {
        this.log('Testing hash compatibility between EVM and ICP...');
        
        try {
            const secret = crypto.randomBytes(32);
            this.log(`Test secret: 0x${secret.toString('hex')}`);
            
            // Generate hashlock on EVM
            const evmHashlock = await escrow.generateHashlock(secret);
            this.log(`EVM hashlock: ${evmHashlock}`);
            
            // Generate hashlock on JavaScript (should match EVM)
            const jsHashlock = ethers.keccak256(secret);
            this.log(`JS hashlock: ${jsHashlock}`);
            
            // Test ICP hashlock generation
            const icpTestCmd = `dfx canister call icp_escrow_backend create_test_hashlock '(vec { ${Array.from(secret).join('; ')} })'`;
            const icpOutput = execSync(icpTestCmd, {
                cwd: './icp_escrow',
                encoding: 'utf-8'
            });
            
            // Extract hashlock from ICP output (format: (vec { 1; 2; 3; ... }))
            const icpHashMatch = icpOutput.match(/vec \{ ([^}]+) \}/);
            if (!icpHashMatch) {
                throw new Error('Could not extract ICP hashlock from output');
            }
            
            const icpHashBytes = icpHashMatch[1].split(';').map(n => parseInt(n.trim()));
            const icpHashlock = '0x' + Buffer.from(icpHashBytes).toString('hex');
            this.log(`ICP hashlock: ${icpHashlock}`);
            
            // Verify all three match
            if (evmHashlock === jsHashlock && jsHashlock === icpHashlock) {
                this.success('Hash compatibility verified! All systems generate identical hashlocks');
                this.results.hashCompatibility = true;
            } else {
                this.error('Hash compatibility FAILED! Different systems generate different hashlocks');
                this.error(`EVM: ${evmHashlock}`);
                this.error(`JS:  ${jsHashlock}`);
                this.error(`ICP: ${icpHashlock}`);
                this.results.hashCompatibility = false;
            }
            
        } catch (error) {
            this.error(`Hash compatibility test failed: ${error.message}`);
            this.results.hashCompatibility = false;
            throw error;
        }
    }

    // Test 4: Token Support on Both Sides
    async testTokenSupport(mockToken, escrow) {
        this.log('Testing token support on both EVM and ICP sides...');
        
        try {
            const [deployer, user] = await ethers.getSigners();
            
            // Test ERC20 token operations
            this.log('Testing ERC20 token operations...');
            
            // Mint tokens to user
            await mockToken.mint(user.address, ethers.parseUnits('100', 18));
            const userBalance = await mockToken.balanceOf(user.address);
            this.success(`Minted tokens to user: ${ethers.formatUnits(userBalance, 18)}`);
            
            // Test token approval
            const userToken = mockToken.connect(user);
            await userToken.approve(await escrow.getAddress(), ethers.parseUnits('50', 18));
            const allowance = await mockToken.allowance(user.address, await escrow.getAddress());
            this.success(`Token approval working: ${ethers.formatUnits(allowance, 18)}`);
            
            // Test ICP token infrastructure (basic verification)
            this.log('Testing ICP ICRC-1 token infrastructure...');
            
            // Create a test escrow to verify token parameters are handled
            const secret = crypto.randomBytes(32);
            const hashlock = ethers.keccak256(secret);
            const orderHash = crypto.randomBytes(32);
            
            const createCmd = `dfx canister call icp_escrow_backend create_escrow '(
                vec { ${Array.from(orderHash).join('; ')} },
                vec { ${Array.from(ethers.getBytes(hashlock)).join('; ')} },
                "${user.address}",
                "${deployer.address}",
                "test-principal",
                1000000n,
                100000n,
                10,
                50,
                120,
                1,
                "${await escrow.getAddress()}",
                true
            )'`;
            
            const createOutput = execSync(createCmd, {
                cwd: './icp_escrow',
                encoding: 'utf-8'
            });
            
            const escrowIdMatch = createOutput.match(/\("([^"]+)"\)/);
            if (escrowIdMatch) {
                this.success(`ICP escrow creation with token parameters successful: ${escrowIdMatch[1]}`);
            } else {
                throw new Error('Failed to create ICP escrow with token parameters');
            }
            
            this.results.tokenSupport = true;
            
        } catch (error) {
            this.error(`Token support test failed: ${error.message}`);
            this.results.tokenSupport = false;
            throw error;
        }
    }

    // Main verification process
    async verify() {
        console.log('🚀 Starting Component Verification for EVM-ICP Atomic Swap\n');
        
        let evmContracts = null;
        
        try {
            // Test 1: EVM Contracts
            console.log('=== Test 1: EVM Contracts ===');
            evmContracts = await this.testEVMContracts();
            console.log('');
            
            // Test 2: ICP Canister
            console.log('=== Test 2: ICP Canister ===');
            await this.testICPCanister();
            console.log('');
            
            // Test 3: Hash Compatibility
            console.log('=== Test 3: Hash Compatibility ===');
            await this.testHashCompatibility(evmContracts.escrow);
            console.log('');
            
            // Test 4: Token Support
            console.log('=== Test 4: Token Support ===');
            await this.testTokenSupport(evmContracts.mockToken, evmContracts.escrow);
            console.log('');
            
        } catch (error) {
            this.error(`Verification failed: ${error.message}`);
        }
        
        // Print summary
        console.log('=== Verification Summary ===');
        console.log(`EVM Contracts:     ${this.results.evmContracts ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`ICP Canister:      ${this.results.icpCanister ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Hash Compatibility: ${this.results.hashCompatibility ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`Token Support:     ${this.results.tokenSupport ? '✅ PASS' : '❌ FAIL'}`);
        
        const allPassed = Object.values(this.results).every(result => result === true);
        
        if (allPassed) {
            console.log('\n🎉 All components verified successfully!');
            console.log('✅ Ready to run complete atomic swap demo');
        } else {
            console.log('\n❌ Some components failed verification');
            console.log('Please fix the failing components before running the full demo');
        }
        
        return allPassed;
    }
}

// Run verification if called directly
if (require.main === module) {
    const verifier = new ComponentVerifier();
    verifier.verify().catch(console.error);
}

module.exports = ComponentVerifier;