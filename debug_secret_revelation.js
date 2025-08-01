#!/usr/bin/env node

/**
 * Debug Secret Revelation Issue
 * 
 * This script tests the exact secret revelation problem:
 * 1. Generate a real secret and hashlock
 * 2. Create ICP escrow with the real hashlock
 * 3. Try to withdraw with the real secret
 * 4. Compare with the "working" hardcoded secret
 */

const { ethers } = require('ethers');
const { execSync } = require('child_process');
const crypto = require('crypto');

// Configuration
const ICP_CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';
const ICP_RECIPIENT_PRINCIPAL = '64a6m-2gtn5-qlocj-yvw4g-onyod-zfeud-gp27e-hoouv-s3r7w-agwwa-eae';

class SecretRevelationDebugger {
    constructor() {
        this.realSecret = crypto.randomBytes(32);
        this.realHashlock = null;
        this.workingSecret = Buffer.from([
            0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10,
            0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18,
            0x19, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f, 0x20
        ]);
        this.workingHashlock = null;
        this.escrowId = null;
    }

    async initialize() {
        console.log('🔍 DEBUGGING SECRET REVELATION ISSUE\n');
        console.log('=' .repeat(60));
        
        // Generate real hashlock
        this.realHashlock = ethers.utils.keccak256(this.realSecret);
        
        // Generate working hashlock
        this.workingHashlock = ethers.utils.keccak256(this.workingSecret);
        
        console.log('📊 SECRET ANALYSIS:');
        console.log(`   Real Secret (hex): ${this.realSecret.toString('hex')}`);
        console.log(`   Real Hashlock: ${this.realHashlock}`);
        console.log(`   Working Secret (hex): ${this.workingSecret.toString('hex')}`);
        console.log(`   Working Hashlock: ${this.workingHashlock}`);
        console.log('');
    }

    async createEscrowWithRealHashlock() {
        console.log('🔧 Step 1: Creating ICP escrow with REAL hashlock...');
        
        const orderHashArray = Array.from(ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`debug_order_${Date.now()}`))));
        const hashlockArray = Array.from(ethers.utils.arrayify(this.realHashlock));
        
        const orderHashBlob = `blob "\\${orderHashArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;
        const hashlockBlob = `blob "\\${hashlockArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;
        
        console.log(`   Order Hash Blob: ${orderHashBlob}`);
        console.log(`   Hashlock Blob: ${hashlockBlob}`);
        
        const escrowResult = execSync(
            `dfx canister call ${ICP_CANISTER_ID} create_simple_escrow ` +
            `'(${orderHashBlob}, ${hashlockBlob}, ` +
            `"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 1000000:nat64, ` +
            `5:nat32, 600:nat32, principal "${ICP_RECIPIENT_PRINCIPAL}", ` +
            `999888:nat64, "debug_real_hashlock")'`,
            { encoding: 'utf8', cwd: 'icp_escrow' }
        );
        
        // Extract escrow ID from result
        const match = escrowResult.match(/escrow_(\d+)/);
        if (match) {
            this.escrowId = `escrow_${match[1]}`;
            console.log(`✅ Created escrow: ${this.escrowId}`);
        } else {
            throw new Error('Failed to extract escrow ID');
        }
        
        console.log('');
    }

    async testRealSecretWithdrawal() {
        console.log('🔓 Step 2: Testing withdrawal with REAL secret...');
        
        // Wait for timelock
        console.log('⏳ Waiting for timelock (6 seconds)...');
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        // Convert real secret to blob format
        const realSecretHex = this.realSecret.toString('hex');
        const realSecretBlob = `blob "\\${realSecretHex.match(/.{2}/g).map(hex => `\\${hex}`).join('')}"`;
        
        console.log(`   Real Secret Blob: ${realSecretBlob}`);
        
        try {
            const withdrawResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} withdraw_with_secret '("${this.escrowId}", ${realSecretBlob})'`,
                { encoding: 'utf8', cwd: 'icp_escrow' }
            );
            
            console.log('✅ REAL SECRET WITHDRAWAL SUCCESSFUL!');
            console.log(`   Result: ${withdrawResult.trim()}`);
            
        } catch (error) {
            console.log('❌ REAL SECRET WITHDRAWAL FAILED:');
            console.log(`   Error: ${error.message}`);
        }
        
        console.log('');
    }

    async testWorkingSecretWithdrawal() {
        console.log('🔓 Step 3: Testing withdrawal with WORKING secret...');
        
        // Convert working secret to blob format
        const workingSecretHex = this.workingSecret.toString('hex');
        const workingSecretBlob = `blob "\\${workingSecretHex.match(/.{2}/g).map(hex => `\\${hex}`).join('')}"`;
        
        console.log(`   Working Secret Blob: ${workingSecretBlob}`);
        
        try {
            const withdrawResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} withdraw_with_secret '("${this.escrowId}", ${workingSecretBlob})'`,
                { encoding: 'utf8', cwd: 'icp_escrow' }
            );
            
            console.log('✅ WORKING SECRET WITHDRAWAL SUCCESSFUL!');
            console.log(`   Result: ${withdrawResult.trim()}`);
            
        } catch (error) {
            console.log('❌ WORKING SECRET WITHDRAWAL FAILED:');
            console.log(`   Error: ${error.message}`);
        }
        
        console.log('');
    }

    async verifyHashlockCompatibility() {
        console.log('🔍 Step 4: Verifying hashlock compatibility...');
        
        try {
            // Test hashlock generation on ICP
            const realSecretArray = Array.from(this.realSecret);
            const realSecretBlob = `blob "\\${realSecretArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;
            
            const testResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} create_test_hashlock_32 '(${realSecretBlob})'`,
                { encoding: 'utf8', cwd: 'icp_escrow' }
            );
            
            console.log('📊 ICP Hashlock Test Result:');
            console.log(testResult.trim());
            
            // Extract the generated hashlock from the result
            const hashlockMatch = testResult.match(/Hashlock \(hex\): ([a-f0-9]+)/);
            if (hashlockMatch) {
                const icpGeneratedHashlock = `0x${hashlockMatch[1]}`;
                console.log(`   ICP Generated Hashlock: ${icpGeneratedHashlock}`);
                console.log(`   EVM Generated Hashlock: ${this.realHashlock}`);
                console.log(`   Match: ${icpGeneratedHashlock === this.realHashlock ? '✅ YES' : '❌ NO'}`);
            }
            
        } catch (error) {
            console.log('❌ Hashlock test failed:', error.message);
        }
        
        console.log('');
    }

    async checkEscrowState() {
        console.log('📊 Step 5: Checking escrow state...');
        
        try {
            const stateResult = execSync(
                `dfx canister call ${ICP_CANISTER_ID} get_escrow_state '("${this.escrowId}")'`,
                { encoding: 'utf8', cwd: 'icp_escrow' }
            );
            
            console.log('📋 Escrow State:');
            console.log(stateResult.trim());
            
        } catch (error) {
            console.log('❌ Failed to get escrow state:', error.message);
        }
        
        console.log('');
    }

    async runDebug() {
        try {
            await this.initialize();
            await this.createEscrowWithRealHashlock();
            await this.verifyHashlockCompatibility();
            await this.testRealSecretWithdrawal();
            await this.testWorkingSecretWithdrawal();
            await this.checkEscrowState();
            
            console.log('🎯 DEBUG ANALYSIS COMPLETE');
            console.log('=' .repeat(60));
            console.log('This will help us understand why the secret revelation is failing.');
            
        } catch (error) {
            console.error('❌ Debug failed:', error.message);
        }
    }
}

// Run the debug
const secretDebugger = new SecretRevelationDebugger();
secretDebugger.runDebug(); 