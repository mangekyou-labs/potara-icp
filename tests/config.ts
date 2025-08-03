import {z} from 'zod'
import Sdk from '@1inch/cross-chain-sdk'
import {ExtendedNetworkEnum} from '../cross-chain-sdk/src/chains'
import * as process from 'node:process'

const bool = z
    .string()
    .transform((v) => v.toLowerCase() === 'true')
    .pipe(z.boolean())

const ConfigSchema = z.object({
    SRC_CHAIN_RPC: z.string().url(),
    DST_CHAIN_RPC: z.string().url(),
    SRC_CHAIN_CREATE_FORK: bool.default('true'),
    DST_CHAIN_CREATE_FORK: bool.default('true')
})

const fromEnv = ConfigSchema.parse(process.env)

export const config = {
    chain: {
        source: {
            chainId: Sdk.NetworkEnum.ETHEREUM,
            url: fromEnv.SRC_CHAIN_RPC,
            createFork: fromEnv.SRC_CHAIN_CREATE_FORK,
            limitOrderProtocol: '0x111111125421ca6dc452d289314280a0f8842a65',
            wrappedNative: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
            ownerPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            tokens: {
                USDC: {
                    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
                    donor: '0xd54F23BE482D9A58676590fCa79c8E43087f92fB'
                }
            }
        },
        destination: {
            // Use ICP testnet as destination instead of BSC
            chainId: ExtendedNetworkEnum.INTERNET_COMPUTER_TESTNET,
            url: 'http://127.0.0.1:4943', // ICP local replica
            createFork: false, // ICP doesn't use forks
            // ICP-specific configuration
            canisterId: 'uxrrr-q7777-77774-qaaaq-cai', // Your deployed ICP escrow canister
            ownerPrivateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
            // ICP token configuration (using ICP native tokens)
            tokens: {
                ICP: {
                    address: 'ryjl3-tyaaa-aaaaa-aaaba-cai', // ICP ledger canister
                    donor: '2vxsx-fae', // Anonymous principal
                    decimals: 8
                }
            }
        }
    }
} as const

export type ChainConfig = (typeof config.chain)['source' | 'destination']
