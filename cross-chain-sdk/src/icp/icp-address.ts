import {Address} from '@1inch/fusion-sdk'
import {ICPAddress, ICPPrincipal, ICPCanister, ICPAddressValidation} from './types'

/**
 * ICP Address utilities for handling principals and canisters
 */
export class ICPAddressUtils {
    /**
     * Validate if a string is a valid ICP address (principal or canister)
     */
    public static validateAddress(address: string): ICPAddressValidation {
        if (!address || typeof address !== 'string') {
            return {
                isValid: false,
                type: 'invalid',
                address: address,
                error: 'Address must be a non-empty string'
            }
        }

        // Remove any whitespace
        const cleanAddress = address.trim()

        // Check if it's a valid base32 string
        if (!this.isValidBase32(cleanAddress)) {
            return {
                isValid: false,
                type: 'invalid',
                address: cleanAddress,
                error: 'Invalid base32 encoding'
            }
        }

        // Check length (ICP addresses have reasonable length limits)
        if (cleanAddress.length < 8 || cleanAddress.length > 50) {
            return {
                isValid: false,
                type: 'invalid',
                address: cleanAddress,
                error: cleanAddress.length < 8 ? 'Address too short' : 'Address too long'
            }
        }

        // Try to determine if it's a principal or canister
        // This is a simplified check - in practice, you'd need more sophisticated validation
        if (cleanAddress.length === 27) {
            return {
                isValid: true,
                type: 'canister',
                address: cleanAddress
            }
        } else {
            return {
                isValid: true,
                type: 'principal',
                address: cleanAddress
            }
        }
    }

    /**
     * Check if a string is valid ICP address format
     */
    private static isValidBase32(str: string): boolean {
        // ICP addresses use base32 characters with hyphens as separators
        // Format: xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
        const icpAddressRegex = /^[a-z2-7]+(-[a-z2-7]+)*$/
        return icpAddressRegex.test(str)
    }

    /**
     * Convert ICP address to bytes (for cross-chain compatibility)
     */
    public static addressToBytes(address: ICPAddress): Uint8Array {
        const validation = this.validateAddress(address)
        if (!validation.isValid) {
            throw new Error(`Invalid ICP address: ${validation.error}`)
        }

        // Convert base32 to bytes
        return this.base32ToBytes(address)
    }

    /**
     * Convert bytes to ICP address
     */
    public static bytesToAddress(bytes: Uint8Array): ICPAddress {
        return this.bytesToBase32(bytes)
    }

    /**
     * Convert base32 string to bytes
     */
    private static base32ToBytes(base32: string): Uint8Array {
        // Simplified base32 decoding for ICP addresses
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = 0
        let value = 0
        const output: number[] = []

        for (let i = 0; i < base32.length; i++) {
            const char = base32[i].toUpperCase()
            if (char === '-') continue // Skip hyphens
            
            const index = alphabet.indexOf(char)
            if (index === -1) {
                throw new Error(`Invalid base32 character: ${char}`)
            }

            value = (value << 5) | index
            bits += 5

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 0xFF)
                bits -= 8
            }
        }

        return new Uint8Array(output)
    }

    /**
     * Convert bytes to base32 string
     */
    private static bytesToBase32(bytes: Uint8Array): string {
        // Simplified base32 encoding for ICP addresses
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
        let bits = 0
        let value = 0
        let output = ''

        for (let i = 0; i < bytes.length; i++) {
            value = (value << 8) | bytes[i]
            bits += 8

            while (bits >= 5) {
                output += alphabet[(value >>> (bits - 5)) & 0x1F]
                bits -= 5
            }
        }

        if (bits > 0) {
            output += alphabet[(value << (5 - bits)) & 0x1F]
        }

        // Add hyphens for ICP format
        return this.addHyphens(output.toLowerCase())
    }

    /**
     * Add hyphens to base32 string for ICP format
     */
    private static addHyphens(base32: string): string {
        const result = []
        for (let i = 0; i < base32.length; i += 5) {
            result.push(base32.slice(i, i + 5))
        }
        return result.join('-')
    }

    /**
     * Create address mapping between EVM and ICP
     */
    public static createAddressMapping(
        evmAddress: string,
        icpPrincipal: ICPPrincipal,
        chainId: number
    ) {
        return {
            evmAddress,
            icpPrincipal,
            chainId,
            mappingId: `${evmAddress}-${icpPrincipal}-${chainId}`
        }
    }

    /**
     * Check if two addresses are equivalent (cross-chain)
     */
    public static areAddressesEquivalent(
        address1: string | ICPAddress,
        address2: string | ICPAddress
    ): boolean {
        // Normalize addresses
        const norm1 = typeof address1 === 'string' ? address1.toLowerCase() : address1
        const norm2 = typeof address2 === 'string' ? address2.toLowerCase() : address2
        
        return norm1 === norm2
    }
}

/**
 * ICP Address class for handling ICP addresses
 */
export class ICPAddressClass {
    private readonly address: ICPAddress
    private readonly validation: ICPAddressValidation

    constructor(address: ICPAddress) {
        this.address = address
        this.validation = ICPAddressUtils.validateAddress(address)
        
        if (!this.validation.isValid) {
            throw new Error(`Invalid ICP address: ${this.validation.error}`)
        }
    }

    public toString(): string {
        return this.address
    }

    public getType(): 'principal' | 'canister' {
        return this.validation.type as 'principal' | 'canister'
    }

    public isPrincipal(): boolean {
        return this.validation.type === 'principal'
    }

    public isCanister(): boolean {
        return this.validation.type === 'canister'
    }

    public toBytes(): Uint8Array {
        return ICPAddressUtils.addressToBytes(this.address)
    }

    public static fromBytes(bytes: Uint8Array): ICPAddressClass {
        const address = ICPAddressUtils.bytesToAddress(bytes)
        return new ICPAddressClass(address)
    }

    public static fromString(address: string): ICPAddressClass {
        return new ICPAddressClass(address)
    }

    public static isValid(address: string): boolean {
        return ICPAddressUtils.validateAddress(address).isValid
    }
}

/**
 * Simplified ICPAddress class for cross-chain compatibility
 */
export class ICPAddress {
    private readonly address: string

    constructor(address: string) {
        this.address = address
        if (!ICPAddressUtils.validateAddress(address).isValid) {
            throw new Error(`Invalid ICP address: ${address}`)
        }
    }

    public toString(): string {
        return this.address
    }

    public toBytes(): Uint8Array {
        return ICPAddressUtils.addressToBytes(this.address)
    }

    public static fromPrincipal(principal: string): ICPAddress {
        return new ICPAddress(principal)
    }

    public static fromCanister(canisterId: string): ICPAddress {
        return new ICPAddress(canisterId)
    }

    public static fromEVMAddress(evmAddress: string): ICPAddress {
        // Convert EVM address to ICP principal (simplified)
        // In real implementation, this would use proper mapping
        const principal = `2vxsx-fae-${evmAddress.slice(2, 10)}` // Simplified mapping
        return new ICPAddress(principal)
    }

    public static fromBytes(bytes: Uint8Array): ICPAddress {
        const address = ICPAddressUtils.bytesToAddress(bytes)
        return new ICPAddress(address)
    }

    public static isValid(address: string): boolean {
        return ICPAddressUtils.validateAddress(address).isValid
    }
} 