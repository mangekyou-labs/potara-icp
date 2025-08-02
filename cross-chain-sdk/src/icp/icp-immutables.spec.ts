import ICPImmutables from './icp-immutables'
import ICPTimelocks from './icp-timelocks'

describe('ICPImmutables', () => {
    const mockTimelocks = ICPTimelocks.createRelative({
        srcWithdrawal: 10,
        dstWithdrawal: 10
    })

    const validImmutablesData = {
        orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
        hashlock: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        maker: '0x1234567890123456789012345678901234567890',
        taker: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        token: 'rrkah-fqaaa-aaaaa-aaaaq-cai',
        amount: 1000000000000000000n, // 1 token
        safetyDeposit: 1000000000000000n, // 0.001 token
        timelocks: mockTimelocks,
        salt: '123',
        chainId: 1000
    }

    describe('constructor', () => {
        it('should create immutables with valid data', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            
            expect(immutables.orderHash).toBe(validImmutablesData.orderHash)
            expect(immutables.hashlock).toBe(validImmutablesData.hashlock)
            expect(immutables.maker).toBe(validImmutablesData.maker)
            expect(immutables.taker).toBe(validImmutablesData.taker)
            expect(immutables.token).toBe(validImmutablesData.token)
            expect(immutables.amount).toEqual(validImmutablesData.amount)
            expect(immutables.safetyDeposit).toEqual(validImmutablesData.safetyDeposit)
            expect(immutables.timelocks).toBe(validImmutablesData.timelocks)
            expect(immutables.salt).toBe(validImmutablesData.salt)
            expect(immutables.chainId).toBe(validImmutablesData.chainId)
        })

        it('should use default values for optional parameters', () => {
            const dataWithoutOptionals = { ...validImmutablesData }
            delete dataWithoutOptionals.salt
            delete dataWithoutOptionals.chainId

            const immutables = new ICPImmutables(dataWithoutOptionals)
            
            expect(immutables.salt).toBe('0')
            expect(immutables.chainId).toBe(1000)
        })
    })

    describe('fromEVMImmutables', () => {
        it('should create ICP immutables from EVM immutables', () => {
            const evmImmutables = {
                orderHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
                hashlock: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                maker: '0x1234567890123456789012345678901234567890',
                taker: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
                token: '0x1234567890123456789012345678901234567890',
                amount: 1000000000000000000n,
                safetyDeposit: 1000000000000000n,
                timelocks: {
                    srcWithdrawal: 10n,
                    srcPublicWithdrawal: 120n,
                    srcCancellation: 121n,
                    srcPublicCancellation: 240n,
                    dstWithdrawal: 10n,
                    dstPublicWithdrawal: 100n,
                    dstCancellation: 101n
                },
                salt: '123',
                chainId: 1
            }

            const icpToken = 'rrkah-fqaaa-aaaaa-aaaaq-cai'
            const icpImmutables = ICPImmutables.fromEVMImmutables(evmImmutables, icpToken)

            expect(icpImmutables.orderHash).toBe(evmImmutables.orderHash)
            expect(icpImmutables.hashlock).toBe(evmImmutables.hashlock)
            expect(icpImmutables.maker).toBe(evmImmutables.maker)
            expect(icpImmutables.taker).toBe(evmImmutables.taker)
            expect(icpImmutables.token).toBe(icpToken)
            expect(icpImmutables.amount).toEqual(evmImmutables.amount)
            expect(icpImmutables.safetyDeposit).toEqual(evmImmutables.safetyDeposit)
            expect(icpImmutables.salt).toBe(evmImmutables.salt)
            expect(icpImmutables.chainId).toBe(1000) // ICP mainnet
        })
    })

    describe('toEVMFormat', () => {
        it('should convert to EVM-compatible format', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            const evmFormat = immutables.toEVMFormat()

            expect(evmFormat.orderHash).toBe(validImmutablesData.orderHash)
            expect(evmFormat.hashlock).toBe(validImmutablesData.hashlock)
            expect(evmFormat.maker).toBe(validImmutablesData.maker)
            expect(evmFormat.taker).toBe(validImmutablesData.taker)
            expect(evmFormat.token).toBe(validImmutablesData.token)
            expect(evmFormat.amount).toEqual(validImmutablesData.amount)
            expect(evmFormat.safetyDeposit).toEqual(validImmutablesData.safetyDeposit)
            expect(evmFormat.salt).toBe(validImmutablesData.salt)
            expect(evmFormat.chainId).toBe(validImmutablesData.chainId)
            expect(evmFormat.timelocks).toBeDefined()
        })
    })

    describe('validate', () => {
        it('should validate correct immutables', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            const result = immutables.validate()

            expect(result.isValid).toBe(true)
            expect(result.errors).toHaveLength(0)
        })

        it('should reject invalid order hash', () => {
            const invalidData = { ...validImmutablesData, orderHash: 'invalid' }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid order hash format')
        })

        it('should reject invalid hashlock', () => {
            const invalidData = { ...validImmutablesData, hashlock: 'invalid' }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid hashlock format')
        })

        it('should reject invalid maker address', () => {
            const invalidData = { ...validImmutablesData, maker: 'invalid' }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid maker address format')
        })

        it('should reject invalid taker address', () => {
            const invalidData = { ...validImmutablesData, taker: 'invalid' }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid taker address format')
        })

        it('should reject invalid token canister ID', () => {
            const invalidData = { ...validImmutablesData, token: 'invalid' }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Invalid token canister ID format')
        })

        it('should reject zero amount', () => {
            const invalidData = { ...validImmutablesData, amount: 0n }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Amount must be greater than 0')
        })

        it('should reject negative safety deposit', () => {
            const invalidData = { ...validImmutablesData, safetyDeposit: -1n }
            const immutables = new ICPImmutables(invalidData)
            const result = immutables.validate()

            expect(result.isValid).toBe(false)
            expect(result.errors).toContain('Safety deposit cannot be negative')
        })
    })

    describe('getEscrowId', () => {
        it('should generate unique escrow ID', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            const escrowId = immutables.getEscrowId()

            expect(escrowId).toBe(`${validImmutablesData.orderHash}-${validImmutablesData.salt}`)
        })
    })

    describe('isForChain', () => {
        it('should return true for matching chain ID', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            
            expect(immutables.isForChain(1000)).toBe(true)
            expect(immutables.isForChain(1)).toBe(false)
        })
    })

    describe('isForICP', () => {
        it('should return true for ICP chain IDs', () => {
            const icpMainnet = new ICPImmutables({ ...validImmutablesData, chainId: 1000 })
            const icpTestnet = new ICPImmutables({ ...validImmutablesData, chainId: 1001 })
            const evmChain = new ICPImmutables({ ...validImmutablesData, chainId: 1 })

            expect(icpMainnet.isForICP()).toBe(true)
            expect(icpTestnet.isForICP()).toBe(true)
            expect(evmChain.isForICP()).toBe(false)
        })
    })

    describe('toObject', () => {
        it('should return plain object representation', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            const obj = immutables.toObject()

            expect(obj).toEqual(validImmutablesData)
        })
    })

    describe('clone', () => {
        it('should create copy with updated parameters', () => {
            const immutables = new ICPImmutables(validImmutablesData)
            const cloned = immutables.clone({
                salt: '456',
                chainId: 1001
            })

            expect(cloned.salt).toBe('456')
            expect(cloned.chainId).toBe(1001)
            expect(cloned.orderHash).toBe(validImmutablesData.orderHash) // Unchanged
            expect(cloned.hashlock).toBe(validImmutablesData.hashlock) // Unchanged
        })
    })
}) 