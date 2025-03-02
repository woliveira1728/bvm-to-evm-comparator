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
  const [txid, setTxid] = useState("");
  const baseUrlWhatsOnChain = 'https://test.whatsonchain.com/tx/';

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

      // Converte a mensagem inicial para hexadecimal
      const initialMessage = toHex(Buffer.from("Hello from sCrypt!").toString('hex'));
      const address = await wallet.getDefaultAddress();
      const ownerPubKey = await wallet.getPubKey(address);
      const instance = new MessageStorageSCrypt(initialMessage, PubKey(toHex(ownerPubKey)));

      await instance.connect(wallet);
      const deployTx = await instance.deploy(amount);

      console.log("Contrato implantado. TXID: ", deployTx.id);
      alert("Contrato implantado. TXID: " + deployTx.id);

      // Atualizar a interface do usuário com o novo TXID
      setTxid(deployTx.id);
    } catch (e) {
      console.error("Deploy falhou", e);
      alert("Deploy falhou: " + e);
    }
  };

  // Função para atualizar a mensagem no contrato (desplegar um novo contrato com a nova mensagem)
  const updateMessage = async () => {
    try {
      const wallet = getWallet();

      if (!newMessageValue) {
        alert("Por favor, informe o novo valor da mensagem!");
        return;
      }

      // Converte a nova mensagem para hexadecimal
      const newMessage = toHex(Buffer.from(newMessageValue).toString('hex'));

      // Desplegar um novo contrato com a nova mensagem
      const address = await wallet.getDefaultAddress();
      const ownerPubKey = await wallet.getPubKey(address);
      const instance = new MessageStorageSCrypt(newMessage, PubKey(toHex(ownerPubKey)));

      await instance.connect(wallet);
      const deployTx = await instance.deploy(100); // Ajuste o valor conforme necessário

      console.log("Mensagem atualizada. TXID: ", deployTx.id);
      alert("Mensagem atualizada. TXID: " + deployTx.id);

      // Atualizar a interface do usuário com o novo TXID
      setTxid(deployTx.id);
    } catch (e) {
      console.error("Atualização falhou", e);
      alert("Atualização falhou: " + e);
    }
  };

  // Função para ler a mensagem armazenada no contrato
  const readMessage = async () => {
    try {
      if (!txid) {
        alert("Por favor, informe um TXID válido!");
        return;
      }

      // Recupera a transação a partir do TXID informado
      const tx = await provider.getTransaction(txid);
      console.log("Transação recuperada:", tx.id);

      // Reconstrói a instância do contrato a partir da transação (assumindo que o estado está na saída 0)
      const instance = MessageStorageSCrypt.fromTx(tx, 0);
      if (!instance) {
        alert("Falha ao reconstruir o contrato a partir do TX.");
        return;
      }

      // Converte a mensagem de volta para string
      const messageHex = instance.message;
      const message = Buffer.from(messageHex, 'hex').toString('utf-8');

      alert("Mensagem armazenada: " + message);
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
                type="password"
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
          <div style={{ textAlign: 'center', marginTop: '10px' }}>
            {txid ? (
              <p style={{ fontSize: '14px' }}>
                TXID: <a href={`${baseUrlWhatsOnChain}${txid}`} target="_blank" rel="noopener noreferrer"
                style={{ textDecoration: 'none', color: 'inherit' }}
                >{txid}</a>
              </p>
            ) : null}
          </div>
          <div style={{ textAlign: 'center' }}>
            <label style={{ fontSize: '14px' }}>
              Informe o novo valor da mensagem e pressione Update para atualizar:
            </label>
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
              onClick={updateMessage}
              style={{ fontSize: '14px', padding: '5px', marginRight: '10px' }}
            >
              Update Message
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
      </header>
    </div>
  );
}

export default MessageStorage;