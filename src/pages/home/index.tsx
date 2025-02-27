import React, { useRef } from 'react';
import { DefaultProvider, sha256, bsv, TestWallet, toByteString } from "scrypt-ts";
import { BvmToEvmComparator } from "../../contracts/bvmToEvmComparator";


const provider = new DefaultProvider({network: bsv.Networks.testnet});
let Alice: TestWallet;
const privateKey = bsv.PrivateKey.fromHex("d3acda8b36c0efeee4549f68d538e9645f67a2ff797f6a12c305fb4b37cda832", bsv.Networks.testnet);

function Home() {

  const deploy = async (amount: any) => {

    Alice = new TestWallet(privateKey, provider)

    const balance = await Alice.getBalance();

    try {
      const signer = Alice
      const message = toByteString('hello world', true)

      const messageHash = sha256(message);
      const instance = new BvmToEvmComparator(0n, messageHash)
      
      await instance.connect(signer);
      
      const deployTx = await instance.deploy(100)

      const txId = deployTx.id;

      const tx = await provider.getTransaction(txId);

      console.log('Helloworld contract deployed: ', tx.id)
      alert('deployed: ' + tx.id)


    } catch (e) {
      console.error('deploy HelloWorld failes', e)
      alert('deploy HelloWorld failes => ' + e)
    }
  };


  const interact = async () => {

    Alice = new TestWallet(privateKey, provider)

    try {

      const signer = Alice
      const txidValue = txid.current?.value?.trim();

      if (!txidValue || txidValue === 'TXID') {
        alert('Por favor, informe um TXID válido!');
        return;
      }

      const message = toByteString('hello world', true)
      
      const tx = await provider.getTransaction(txid.current.value);
      console.log('Current State TXID: ', tx.id);
  
      const instance = BvmToEvmComparator.fromTx(tx, 0);
      if (!instance) {
        alert('Falha ao reconstruir o contrato a partir da transação.');
        return;
      }

      await instance.connect(signer);
      console.log("Contrato conectado:", instance);
  
      const { tx: callTx } = await instance.methods.unlock(message)
      console.log('Helloworld contract `unlock` called: ', callTx.id)
      alert('unlock: ' + callTx.id)
  
    } catch (e) {
      console.error('deploy HelloWorld failes', e)
      alert('deploy HelloWorld failes' + e)
    }
  };

  const txid = useRef<any>(null);

  return (
    <div className="App">
        <header className="App-header">

        <h2 style={{ fontSize: '34px', paddingBottom: '5px', paddingTop: '5px'}}>Hello World - sCrypt & React</h2>

        <div style={{ textAlign: 'center' }}>
                  
                  <label style={{ fontSize: '14px', paddingBottom: '5px' }}
                    >Press Deploy to Create the Contract:  
                  </label>     
        </div>
        <button className="insert" onClick={deploy}
                style={{ fontSize: '14px', paddingBottom: '2px', marginLeft: '5px'}}
        >Deploy</button>
                              

        {/* <img src={logo} className="App-logo" alt="logo" /> 
        
        <a
          className="App-link"
          href="https://www.youtube.com/watch?v=MnfzAx-A1oA&list=PLe_C0QmVAyivD40DXYtUVSAFmx7ntGjJZ"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn sCrypt
        </a>
        */}

        <div>

          <div style={{ textAlign: 'center' }}>
                
                <label style={{ fontSize: '14px', paddingBottom: '2px' }}
                  >Inform the Current TXID and press Unlock to use the Contract:  
                </label>     
          </div>

          <div style={{ display: 'inline-block', textAlign: 'center' }}>
            <label style={{ fontSize: '14px', paddingBottom: '5px' }}  
                > 
                    <input ref={txid} type="hex" name="PVTKEY1" min="1" defaultValue={'TXID'} placeholder="hex" />
                </label>     
            </div>
            <div style={{ display: 'inline-block', textAlign: 'center' }}>
                
                <button className="insert" onClick={interact}
                    style={{ fontSize: '14px', paddingBottom: '2px', marginLeft: '20px'}}
                >Unlock</button>

            </div>
        </div>                      
      </header>
    </div>
  );
}

export default Home;