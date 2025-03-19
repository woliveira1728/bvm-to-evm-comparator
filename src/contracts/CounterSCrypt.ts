import { assert, method, prop, SmartContract } from 'scrypt-ts';

export class CounterSCrypt extends SmartContract {
    @prop(true)
    counter: bigint;

    constructor(counter: bigint) {
        super(...arguments);
        this.counter = counter;
    }

    @method()
    public updateValue(newValue: bigint) {
        this.counter = newValue;
        assert(true);
    }
}
