const { ethers } = require('ethers');

// Test with the same values from the demo
const demoOrderHash = '0xbbb93b7d36eca5bd2b5ff08895e15b54b1164d1a1cba4f3a3277bbade87fb709';
const demoHashlock = '0xe5cf4384784bf20bd63254adb5a6519b4407ec01bbb0f2ac4ddaa4233dfee283';

console.log('🔍 Debugging Blob Format Issue\n');

// Method 1: Current approach (failing)
const orderHashArray = Array.from(ethers.utils.arrayify(demoOrderHash));
const hashlockArray = Array.from(ethers.utils.arrayify(demoHashlock));

console.log('📊 Array Analysis:');
console.log(`   Order Hash Array Length: ${orderHashArray.length}`);
console.log(`   Hashlock Array Length: ${hashlockArray.length}`);
console.log(`   Order Hash Array: [${orderHashArray.join(', ')}]`);
console.log(`   Hashlock Array: [${hashlockArray.join(', ')}]`);

// Method 2: Working approach (from successful test)
const workingOrderHash = '0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';
const workingHashlock = '0x2122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f40';

const workingOrderHashArray = Array.from(ethers.utils.arrayify(workingOrderHash));
const workingHashlockArray = Array.from(ethers.utils.arrayify(workingHashlock));

console.log('\n📊 Working Array Analysis:');
console.log(`   Working Order Hash Array Length: ${workingOrderHashArray.length}`);
console.log(`   Working Hashlock Array Length: ${workingHashlockArray.length}`);
console.log(`   Working Order Hash Array: [${workingOrderHashArray.join(', ')}]`);
console.log(`   Working Hashlock Array: [${workingHashlockArray.join(', ')}]`);

// Generate blob formats
const orderHashBlob = `blob "\\${orderHashArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;
const hashlockBlob = `blob "\\${hashlockArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;

const workingOrderHashBlob = `blob "\\${workingOrderHashArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;
const workingHashlockBlob = `blob "\\${workingHashlockArray.map(b => b.toString(16).padStart(2, '0')).map(hex => `\\${hex}`).join('')}"`;

console.log('\n🔧 Generated Blob Formats:');
console.log(`   Order Hash Blob: ${orderHashBlob}`);
console.log(`   Hashlock Blob: ${hashlockBlob}`);
console.log(`   Working Order Hash Blob: ${workingOrderHashBlob}`);
console.log(`   Working Hashlock Blob: ${workingHashlockBlob}`);

console.log('\n📏 Blob Lengths:');
console.log(`   Order Hash Blob Length: ${orderHashBlob.length}`);
console.log(`   Hashlock Blob Length: ${hashlockBlob.length}`);
console.log(`   Working Order Hash Blob Length: ${workingOrderHashBlob.length}`);
console.log(`   Working Hashlock Blob Length: ${workingHashlockBlob.length}`);

// Check if the issue is with the hex values
console.log('\n🔍 Hex Value Analysis:');
const orderHashHex = orderHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
const hashlockHex = hashlockArray.map(b => b.toString(16).padStart(2, '0')).join('');

console.log(`   Order Hash Hex: ${orderHashHex}`);
console.log(`   Hashlock Hex: ${hashlockHex}`);
console.log(`   Order Hash Hex Length: ${orderHashHex.length}`);
console.log(`   Hashlock Hex Length: ${hashlockHex.length}`);

// The working format should be exactly 32 bytes
console.log('\n✅ Expected Format:');
console.log('   Working format: blob "\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13\\14\\15\\16\\17\\18\\19\\1a\\1b\\1c\\1d\\1e\\1f\\20"');
console.log('   This has exactly 32 bytes represented as hex pairs'); 