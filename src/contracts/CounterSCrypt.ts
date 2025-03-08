import { assert, method, prop, SmartContract } from 'scrypt-ts';

export class CounterSCrypt extends SmartContract {
    @prop(true)
    counter: bigint;

    constructor() {
        super(...arguments);
        this.counter = 0n;
    }

    @method()
    public increment() {
        this.counter += 1n;
        assert(true);
    }

    @method()
    public decrement() {
        this.counter -= 1n;
        assert(true);
    }
}
