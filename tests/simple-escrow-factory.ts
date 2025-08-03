import {id, Interface, JsonRpcProvider} from 'ethers'
import Sdk from '@1inch/cross-chain-sdk'
import SimpleTestEscrowFactoryContract from '../dist/contracts/SimpleTestEscrowFactory.sol/SimpleTestEscrowFactory.json'

export class SimpleEscrowFactory {
    private iface = new Interface(SimpleTestEscrowFactoryContract.abi)

    constructor(
        private readonly provider: JsonRpcProvider,
        private readonly address: string
    ) {}

    public async getSourceImpl(): Promise<Sdk.Address> {
        // Return a mock implementation address
        return new Sdk.Address('0x1111111111111111111111111111111111111111')
    }

    public async getDestinationImpl(): Promise<Sdk.Address> {
        // Return a mock implementation address
        return new Sdk.Address('0x2222222222222222222222222222222222222222')
    }

    public async getSrcDeployEvent(blockHash: string): Promise<[Sdk.Immutables, Sdk.DstImmutablesComplement]> {
        const event = this.iface.getEvent('SrcEscrowCreated')!
        const logs = await this.provider.getLogs({
            blockHash,
            address: this.address,
            topics: [event.topicHash]
        })

        if (logs.length === 0) {
            throw new Error('No SrcEscrowCreated event found')
        }

        const [data] = logs.map((l) => this.iface.decodeEventLog(event, l.data))

        // Create mock immutables for testing
        const mockOrderHash = data[0] || '0x1234567890123456789012345678901234567890123456789012345678901234'
        const mockHashLock = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd'
        const mockMaker = data[2] || '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        const mockTaker = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
        const mockToken = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' // USDC
        const mockAmount = data[3] || BigInt(1000000) // 1 USDC
        const mockSafetyDeposit = BigInt(1000000000000000) // 0.001 ETH

        const immutables = Sdk.Immutables.new({
            orderHash: mockOrderHash,
            hashLock: Sdk.HashLock.fromString(mockHashLock),
            maker: Sdk.Address.fromString(mockMaker),
            taker: Sdk.Address.fromString(mockTaker),
            token: Sdk.Address.fromString(mockToken),
            amount: mockAmount,
            safetyDeposit: mockSafetyDeposit,
            timeLocks: Sdk.TimeLocks.new({
                srcWithdrawal: 10n,
                srcPublicWithdrawal: 120n,
                srcCancellation: 121n,
                srcPublicCancellation: 122n,
                dstWithdrawal: 10n,
                dstPublicWithdrawal: 100n,
                dstCancellation: 101n
            })
        })

        const complement = Sdk.DstImmutablesComplement.new({
            maker: Sdk.Address.fromString(mockMaker),
            amount: mockAmount,
            token: Sdk.Address.fromString(mockToken),
            safetyDeposit: mockSafetyDeposit
        })

        return [immutables, complement]
    }
} 