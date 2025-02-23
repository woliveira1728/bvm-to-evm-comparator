import { writeFileSync } from 'fs'
import { BvmToEvmComparator } from '../src/contracts/bvmToEvmComparator'
import { privateKey } from './privateKey'
import { bsv, TestWallet, DefaultProvider, sha256, toByteString } from 'scrypt-ts'

function getScriptHash(scriptPubKeyHex: string) {
    const res = sha256(scriptPubKeyHex).match(/.{2}/g)
    if (!res) {
        throw new Error('scriptPubKeyHex is not of even length')
    }
    return res.reverse().join('')
}

async function main() {
    await BvmToEvmComparator.loadArtifact()

    // Prepare signer. 
    // See https://scrypt.io/docs/how-to-deploy-and-call-a-contract/#prepare-a-signer-and-provider
    const signer = new TestWallet(privateKey, new DefaultProvider({
        network: bsv.Networks.testnet
    }))

    // TODO: Adjust the amount of satoshis locked in the smart contract:
    const amount = 100
    const message = toByteString('hello world', true);
    const messageHash = sha256(message);

    const instance = new BvmToEvmComparator(
        // TODO: Pass constructor parameter values.
        0n,
        messageHash
    )

    // Contract deployment.
    const deployTx = await instance.deploy(amount, messageHash)
    await instance.connect(signer)

    // Save deployed contracts script hash.
    const scriptHash = getScriptHash(instance.lockingScript.toHex())
    const shFile = `.scriptHash`;
    writeFileSync(shFile, scriptHash);

    console.log('BvmToEvmComparator contract was successfully deployed!')
    console.log(`TXID: ${deployTx.id}`)
    console.log(`scriptHash: ${scriptHash}`)
}

main()
