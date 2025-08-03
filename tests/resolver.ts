import {ethers} from 'ethers'
import Sdk from '@1inch/cross-chain-sdk'
import Contract from '../dist/contracts/Resolver.sol/Resolver.json'

export class Resolver {
    private readonly iface = new ethers.utils.Interface(Contract.abi)

    constructor(
        public readonly srcAddress: string,
        public readonly dstAddress: string
    ) {}

    public deploySrc(
        chainId: number,
        order: Sdk.CrossChainOrder,
        signature: string,
        takerTraits: Sdk.TakerTraits,
        amount: bigint,
        hashLock = order.escrowExtension.hashLockInfo
    ): ethers.providers.TransactionRequest {
        const {r, yParityAndS: vs} = ethers.utils.splitSignature(signature)
        const {args, trait} = takerTraits.encode()
        const immutables = order.toSrcImmutables(chainId, new Sdk.Address(this.srcAddress), amount, hashLock)

        return {
            to: this.srcAddress,
            data: this.iface.encodeFunctionData('deploySrc', [
                immutables.build(),
                order.build(),
                r,
                vs,
                amount,
                trait,
                args
            ]),
            value: order.escrowExtension.srcSafetyDeposit
        }
    }

    public deployDst(
        /**
         * Immutables from SrcEscrowCreated event with complement applied
         */
        immutables: Sdk.Immutables
    ): ethers.providers.TransactionRequest {
        return {
            to: this.dstAddress,
            data: this.iface.encodeFunctionData('deployDst', [
                immutables.build(),
                immutables.timeLocks.toSrcTimeLocks().privateCancellation
            ]),
            value: immutables.safetyDeposit
        }
    }

    public withdraw(
        side: 'src' | 'dst',
        escrow: Sdk.Address,
        secret: string,
        immutables: Sdk.Immutables
    ): ethers.providers.TransactionRequest {
        return {
            to: side === 'src' ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData('withdraw', [escrow.toString(), secret, immutables.build()])
        }
    }

    public cancel(side: 'src' | 'dst', escrow: Sdk.Address, immutables: Sdk.Immutables): ethers.providers.TransactionRequest {
        return {
            to: side === 'src' ? this.srcAddress : this.dstAddress,
            data: this.iface.encodeFunctionData('cancel', [escrow.toString(), immutables.build()])
        }
    }
}
