import { 
    SmartContract, 
    prop, 
    method, 
    assert, 
    PubKey, 
    Sig, 
    hash256, 
    SigHash,
    ByteString
} from "scrypt-ts";

export class MessageStorageSCrypt extends SmartContract {
    @prop(true) 
    message: ByteString;

    @prop()
    ownerPubKey: PubKey;

    constructor(message: ByteString, ownerPubKey: PubKey) {
        // Passe os parâmetros para o construtor da classe base na mesma ordem
        super(message, ownerPubKey);
        this.message = message;
        this.ownerPubKey = ownerPubKey;
    }

    @method(SigHash.SINGLE)
    public setMessage(newMessage: ByteString, sig: Sig) {
        // Verifica se a assinatura pertence ao dono do contrato
        assert(this.checkSig(sig, this.ownerPubKey), "Assinatura inválida!");

        // Atualiza a mensagem
        this.message = newMessage;

        // Garante que o saldo no contrato não seja alterado
        const amount: bigint = this.ctx.utxo.value;
        const output: ByteString = this.buildStateOutput(amount);
        assert(this.ctx.hashOutputs === hash256(output), "hashOutputs mismatch");
    }

    // Removemos o método getMessage() pois métodos públicos não podem conter return explícito.
    // Para ler o valor da mensagem, acesse a propriedade pública `message`.
}