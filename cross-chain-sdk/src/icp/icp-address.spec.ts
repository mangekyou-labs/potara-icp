import {ICPAddressUtils, ICPAddressClass} from './icp-address'

describe('ICPAddressUtils', () => {
    describe('validateAddress', () => {
        it('should validate a valid principal address', () => {
            const principal = '2vxsx-fae' // Anonymous principal
            const result = ICPAddressUtils.validateAddress(principal)
            
            expect(result.isValid).toBe(true)
            expect(result.type).toBe('principal')
            expect(result.address).toBe(principal)
        })

        it('should validate a valid canister address', () => {
            const canister = 'rrkah-fqaaa-aaaaa-aaaaq-cai' // Root canister
            const result = ICPAddressUtils.validateAddress(canister)
            
            expect(result.isValid).toBe(true)
            expect(result.type).toBe('canister')
            expect(result.address).toBe(canister)
        })

        it('should reject invalid addresses', () => {
            const invalidAddresses = [
                '',
                'invalid@address',
                '0x1234567890123456789012345678901234567890', // EVM address
                'short',
                'way-too-long-address-that-exceeds-maximum-length-allowed',
                'address-with-invalid-chars!',
                'invalid-address-with-uppercase-CHARS'
            ]

            invalidAddresses.forEach(address => {
                const result = ICPAddressUtils.validateAddress(address)
                expect(result.isValid).toBe(false)
                expect(result.type).toBe('invalid')
            })
        })

        it('should handle whitespace', () => {
            const address = '  2vxsx-fae  '
            const result = ICPAddressUtils.validateAddress(address)
            
            expect(result.isValid).toBe(true)
            expect(result.address).toBe('2vxsx-fae')
        })
    })

    describe('addressToBytes and bytesToAddress', () => {
        it('should convert address to bytes and back', () => {
            const originalAddress = '2vxsx-fae'
            const bytes = ICPAddressUtils.addressToBytes(originalAddress)
            const convertedAddress = ICPAddressUtils.bytesToAddress(bytes)
            
            // The conversion removes hyphens, so we compare the cleaned versions
            expect(convertedAddress).toBe(originalAddress.replace(/-/g, ''))
        })

        it('should handle canister addresses', () => {
            const originalAddress = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
            const bytes = ICPAddressUtils.addressToBytes(originalAddress)
            const convertedAddress = ICPAddressUtils.bytesToAddress(bytes)
            
            // The conversion removes hyphens, so we compare the cleaned versions
            expect(convertedAddress).toBe(originalAddress.replace(/-/g, ''))
        })
    })

    describe('areAddressesEquivalent', () => {
        it('should compare EVM addresses correctly', () => {
            const addr1 = '0x1234567890123456789012345678901234567890'
            const addr2 = '0x1234567890123456789012345678901234567890'
            const addr3 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'
            
            expect(ICPAddressUtils.areAddressesEquivalent(addr1, addr2)).toBe(true)
            expect(ICPAddressUtils.areAddressesEquivalent(addr1, addr3)).toBe(false)
        })

        it('should compare ICP addresses correctly', () => {
            const addr1 = '2vxsx-fae'
            const addr2 = '2vxsx-fae'
            const addr3 = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
            
            expect(ICPAddressUtils.areAddressesEquivalent(addr1, addr2)).toBe(true)
            expect(ICPAddressUtils.areAddressesEquivalent(addr1, addr3)).toBe(false)
        })

        it('should return false for cross-chain comparison', () => {
            const evmAddr = '0x1234567890123456789012345678901234567890'
            const icpAddr = '2vxsx-fae'
            
            expect(ICPAddressUtils.areAddressesEquivalent(evmAddr, icpAddr)).toBe(false)
        })
    })
})

describe('ICPAddressClass', () => {
    it('should create valid address instances', () => {
        const principal = '2vxsx-fae'
        const address = new ICPAddressClass(principal)
        
        expect(address.toString()).toBe(principal)
        expect(address.getType()).toBe('principal')
        expect(address.isPrincipal()).toBe(true)
        expect(address.isCanister()).toBe(false)
    })

    it('should create canister address instances', () => {
        const canister = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
        const address = new ICPAddressClass(canister)
        
        expect(address.toString()).toBe(canister)
        expect(address.getType()).toBe('canister')
        expect(address.isPrincipal()).toBe(false)
        expect(address.isCanister()).toBe(true)
    })

    it('should throw error for invalid addresses', () => {
        expect(() => new ICPAddressClass('invalid@address')).toThrow('Invalid ICP address')
    })

    it('should provide static factory methods', () => {
        const principal = '2vxsx-fae'
        
        expect(ICPAddressClass.isValid(principal)).toBe(true)
        expect(ICPAddressClass.isValid('invalid')).toBe(false)
        
        const address = ICPAddressClass.fromString(principal)
        expect(address.toString()).toBe(principal)
    })

            it('should convert to and from bytes', () => {
            const originalAddress = '2vxsx-fae'
            const address = ICPAddressClass.fromString(originalAddress)
            const bytes = address.toBytes()
            const convertedAddress = ICPAddressClass.fromBytes(bytes)
            
            // The conversion removes hyphens, so we compare the cleaned versions
            expect(convertedAddress.toString()).toBe(originalAddress.replace(/-/g, ''))
        })
}) 