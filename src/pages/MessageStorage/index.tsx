import React, { useRef, useState } from 'react';
import { Buffer } from 'buffer';

import {
  DefaultProvider,
  bsv,
  TestWallet,
  toByteString,
  sha256,
  toHex,
  PubKey
} from "scrypt-ts";
import { MessageStorageSCrypt } from "../../contracts/MessageStorageSCrypt";
import path from 'path';

const provider = new DefaultProvider({network: bsv.Networks.testnet});
let Alice: TestWallet;

function MessageStorage() {
  const [privateKeyHex, setPrivateKeyHex] = useState("");
  const [newMessageValue, setNewMessageValue] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [storedMessage, setStoredMessage] = useState("");
  const txidRef = useRef<HTMLInputElement>(null);

  // Função para criar o wallet a partir da chave privada fornecida
  const getWallet = (): TestWallet => {
    if (!privateKeyHex) {
      alert("Chave privada inválida ou ausente");
      throw new Error("Chave privada é obrigatória!");
    }
    const pk = bsv.PrivateKey.fromHex(privateKeyHex, bsv.Networks.testnet);
    return new TestWallet(pk, provider);
  };

  // Função para conectar a carteira e exibir informações
  const connectWallet = async () => {
    try {
      const wallet = getWallet();
      const address = await wallet.getDefaultAddress();
      const publicKey = await wallet.getPubKey(address);
      const balance = await wallet.getBalance();

      setPublicKey(publicKey.toString());
      setAddress(address.toString());
      setBalance(balance.confirmed);
      setIsConnected(true);

    } catch (e) {
      console.error("Conexão com a carteira falhou", e);
      alert("Conexão com a carteira falhou: " + e);
    }
  };

  // Função para realizar o deploy do contrato
  const deploy = async (amount: number) => {
    try {
      const wallet = getWallet();
      const balance = await wallet.getBalance();

      // Converte a mensagem inicial para ByteString
      const initialMessage = toByteString("Hello from sCrypt!", false);
      const address = await wallet.getDefaultAddress();
      const ownerPubKey = await wallet.getPubKey(address);
      const instance = new MessageStorageSCrypt(initialMessage, PubKey(toHex(ownerPubKey)));

      await instance.connect(wallet);
      const deployTx = await instance.deploy(amount);

      alert("Contrato implantado. TXID: " + deployTx.id);
    } catch (e) {
      console.error("Deploy falhou", e);
      alert("Deploy falhou: " + e);
    }
  };

  // Função para interagir com o contrato (chama setMessage para atualizar a mensagem)
  const interact = async () => {
    try {
      const wallet = getWallet();
  
      const txidValue = txidRef.current?.value?.trim();
      if (!txidValue || txidValue === "TXID") {
        alert("Por favor, informe um TXID válido!");
        return;
      }
  
      if (!newMessageValue) {
        alert("Por favor, informe o novo valor da mensagem!");
        return;
      }
  
      // Recupera a transação a partir do TXID fornecido
      const tx = await provider.getTransaction(txidValue);
      console.log("Transação recuperada:", tx.id);
  
      // Reconstrói a instância do contrato a partir da transação (estado na saída 0)
      const instance = MessageStorageSCrypt.fromTx(tx, 0);
      if (!instance) {
        alert("Falha ao reconstruir o contrato a partir do TXID.");
        return;
      }
  
      await instance.connect(wallet);
      console.log("Contrato conectado:", instance);
  
      const newMessage = toByteString(newMessageValue, false);
  
      const { tx: callTx } = await instance.methods.updateMessage(newMessage);
      console.log("updateMessage chamado. TXID:", callTx.id);
      alert("updateMessage TX: " + callTx.id);
    } catch (e) {
      console.error("Interação falhou", e);
      alert("Interação falhou: " + e);
    }
  };

  // Função para ler a mensagem armazenada no contrato
  const readMessage = async () => {
    try {
      const txidValue = txidRef.current?.value?.trim();
      if (!txidValue || txidValue === "TXID") {
        alert("Por favor, informe um TXID válido!");
        return;
      }

      // Recupera a transação a partir do TXID informado
      const tx = await provider.getTransaction(txidValue);
      console.log("Transação recuperada:", tx.id);

      // Reconstrói a instância do contrato a partir da transação (assumindo que o estado está na saída 0)
      const instance = MessageStorageSCrypt.fromTx(tx, 0);
      if (!instance) {
        alert("Falha ao reconstruir o contrato a partir do TX.");
        return;
      }

      // Chama o método readMessage para obter a mensagem armazenada
      const message = instance.message;
      const decodedMessage = Buffer.from(message, 'hex').toString('utf-8');
      setStoredMessage(decodedMessage);
      alert("Mensagem armazenada: " + decodedMessage);
    } catch (e) {
      console.error("Leitura da mensagem falhou", e);
      alert("Leitura da mensagem falhou: " + e);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2 style={{ fontSize: '34px', paddingBottom: '5px', paddingTop: '5px' }}>
          Message Storage - sCrypt & React
        </h2>

        {!isConnected ? (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '14px' }}>
              Chave Privada (hex):
              <input
                type="text"
                value={privateKeyHex}
                onChange={(e) => setPrivateKeyHex(e.target.value)}
                placeholder="Informe sua chave privada em hex"
                style={{ marginLeft: '10px', padding: '5px', width: '400px' }}
              />
            </label>
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            <p style={{ fontSize: '14px' }}>Chave Pública: {publicKey}</p>
            <p style={{ fontSize: '14px' }}>Endereço: {address}</p>
            <p style={{ fontSize: '14px' }}>Saldo: {balance}</p>
          </div>
        )}

        {isConnected ? null : <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <button
            className="insert"
            onClick={connectWallet}
            style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
          >
            Conectar Carteira
          </button>
        </div>}

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <label style={{ fontSize: '14px' }}>
            Pressione Deploy para criar o contrato:
          </label>
          <br />
          <button
            className="insert"
            onClick={() => deploy(100)}
            style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
          >
            Deploy
          </button>
        </div>

        <div style={{ marginTop: '20px' }}>
          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '14px' }}>
              Informe o TXID do contrato implantado, o novo valor da mensagem e pressione Unlock para atualizar:
            </label>
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <input
              ref={txidRef}
              type="text"
              defaultValue="TXID"
              placeholder="Informe o TXID"
              style={{ fontSize: '14px', padding: '5px', width: '400px' }}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <input
              type="text"
              value={newMessageValue}
              onChange={(e) => setNewMessageValue(e.target.value)}
              placeholder="Informe o novo valor da mensagem"
              style={{ fontSize: '14px', padding: '5px', width: '400px' }}
            />
          </div>
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            <button
              className="insert"
              onClick={interact}
              style={{ fontSize: '14px', padding: '5px', marginRight: '10px' }}
            >
              Unlock (Atualizar Mensagem)
            </button>
            <button
              className="insert"
              onClick={readMessage}
              style={{ fontSize: '14px', padding: '5px' }}
            >
              Read Message
            </button>
          </div>
        </div>

        {storedMessage && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ fontSize: '14px' }}>Mensagem Armazenada: {storedMessage}</p>
          </div>
        )}
      </header>
    </div>
  );
}

export default MessageStorage;