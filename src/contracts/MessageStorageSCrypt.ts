import { assert, method, prop, SmartContract, Sig, PubKey, ByteString, toByteString, len } from 'scrypt-ts';

export class MessageStorageSCrypt extends SmartContract {
    @prop(true)
    message: ByteString;

    @prop(true)
    owner: PubKey;

    constructor(message: ByteString, owner: PubKey) {
        super(...arguments);
        this.message = message;
        this.owner = owner;
    }

    @method()
    public updateMessage(newMessage: ByteString) {
        // assert(this.checkSig(sig, this.owner), 'Invalid signature');
        // assert(len(newMessage) > 0 && len(newMessage) <= 256, 'Message too long or empty');
        this.message = newMessage;
        assert(true);
    }
}
