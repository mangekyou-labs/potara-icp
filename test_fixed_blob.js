const { execSync } = require('child_process');

// Configuration
const ICP_CANISTER_ID = 'uxrrr-q7777-77774-qaaaq-cai';
const ICP_RECIPIENT_PRINCIPAL = '64a6m-2gtn5-qlocj-yvw4g-onyod-zfeud-gp27e-hoouv-s3r7w-agwwa-eae';

console.log('🧪 Testing Fixed Blob Format\n');

try {
    // Test with properly formatted blob values
    console.log('1️⃣ Testing with properly formatted blobs...');
    
    // Use simple test values that won't cause interpretation issues
    const orderHashBlob = 'blob "\\01\\02\\03\\04\\05\\06\\07\\08\\09\\0a\\0b\\0c\\0d\\0e\\0f\\10\\11\\12\\13\\14\\15\\16\\17\\18\\19\\1a\\1b\\1c\\1d\\1e\\1f\\20"';
    const hashlockBlob = 'blob "\\21\\22\\23\\24\\25\\26\\27\\28\\29\\2a\\2b\\2c\\2d\\2e\\2f\\30\\31\\32\\33\\34\\35\\36\\37\\38\\39\\3a\\3b\\3c\\3d\\3e\\3f\\40"';
    
    const maker = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    const taker = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
    
    console.log('📋 Test parameters:');
    console.log(`   Order Hash blob: ${orderHashBlob}`);
    console.log(`   Hashlock blob: ${hashlockBlob}`);
    console.log(`   Maker: ${maker}`);
    console.log(`   Taker: ${taker}`);
    console.log(`   Recipient: ${ICP_RECIPIENT_PRINCIPAL}`);
    
    const escrowResult = execSync(
        `dfx canister call ${ICP_CANISTER_ID} create_simple_escrow ` +
        `'(${orderHashBlob}, ${hashlockBlob}, ` +
        `"${maker}", "${taker}", 1000000:nat64, ` +
        `5:nat32, 600:nat32, principal "${ICP_RECIPIENT_PRINCIPAL}", ` +
        `999888:nat64, "test_fixed_blob")'`,
        { encoding: 'utf8', cwd: 'icp_escrow' }
    );
    
    console.log('✅ Fixed blob format works:', escrowResult.trim());

} catch (error) {
    console.error('❌ Test failed:', error.message);
} 