import {
    method,
    prop,
    SmartContract,
    hash256,
    assert,
    SigHash,
    sha256
} from 'scrypt-ts'

import type {ByteString} from 'scrypt-ts';

export class BvmToEvmComparator extends SmartContract {
    @prop(true)
    count: bigint

    @prop(true)
    hash: ByteString;

    constructor(count: bigint, hash: ByteString) {
        super(count, hash)
        this.count = count
        this.hash = hash;
    }

    @method(SigHash.SINGLE)
    public increment() {
        this.count++

        // make sure balance in the contract does not change
        const amount: bigint = this.ctx.utxo.value
        // output containing the latest state
        const output: ByteString = this.buildStateOutput(amount)
        // verify current tx has this single output
        assert(this.ctx.hashOutputs === hash256(output), 'hashOutputs mismatch')
    }

    @method()
    public unlock(message: ByteString) {
        assert(sha256(message) == this.hash, 'Hash does not match');
    }
}
