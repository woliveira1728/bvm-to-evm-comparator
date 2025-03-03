import React, { useRef, useState } from 'react';
import { Buffer } from 'buffer';
import styles from "./style.module.scss";
import { MessageStorageSCrypt } from "../../contracts/MessageStorageSCrypt";
import { ethers, BrowserProvider, ContractFactory, Contract } from "ethers";
import MessageStorageArtifact from "../../artifacts/MessageStorage.json";
import path from 'path';
import {
  DefaultProvider,
  bsv,
  TestWallet,
  toByteString,
  sha256,
  toHex,
  PubKey
} from "scrypt-ts";

const provider = new DefaultProvider({network: bsv.Networks.testnet});
let Alice: TestWallet;

function Home() {
  const [privateKeyHex, setPrivateKeyHex] = useState("");
  const [newMessageValue, setNewMessageValue] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [isBvmConnected, setIsBvmConnected] = useState(false);
  const [isEvmConnected, setIsEvmConnected] = useState(false);
  const [txid, setTxid] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [evmBalance, setEvmBalance] = useState("");
  const [evmContractAddress, setEvmContractAddress] = useState("");
  const baseUrlWhatsOnChain = 'https://test.whatsonchain.com/tx/';

  // Função para criar o wallet a partir da chave privada fornecida
  const getBvmWallet = (): TestWallet => {
    if (!privateKeyHex) {
      alert("Chave privada inválida ou ausente");
      throw new Error("Chave privada é obrigatória!");
    }
    const pk = bsv.PrivateKey.fromHex(privateKeyHex, bsv.Networks.testnet);
    return new TestWallet(pk, provider);
  };

  // Função para conectar a carteira e exibir informações
  const connectBvmWallet = async () => {
    try {
      const wallet = getBvmWallet();
      const address = await wallet.getDefaultAddress();
      const publicKey = await wallet.getPubKey(address);
      const balance = await wallet.getBalance();

      setPublicKey(publicKey.toString());
      setAddress(address.toString());
      setBalance(balance.confirmed);
      setIsBvmConnected(true);

    } catch (e) {
      console.error("Conexão com a carteira falhou", e);
      alert("Conexão com a carteira falhou: " + e);
    }
  };

  // Função para realizar o deploy do contrato
  const deployBvmContract = async (amount: number) => {
    try {
      const wallet = getBvmWallet();
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
  const updateBvmMessage = async () => {
    try {
      const wallet = getBvmWallet();

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
  const readBvmMessage = async () => {
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

  // Função para conectar a carteira EVM
  const connectEvmWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const accounts = await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);

        setEvmAddress(address);
        setEvmBalance(ethers.formatEther(balance));
        setIsEvmConnected(true);
      } catch (e) {
        console.error("Conexão com a carteira EVM falhou", e);
        alert("Conexão com a carteira EVM falhou: " + e);
      }
    } else {
      alert("MetaMask não está instalado!");
    }
  };

  // Função para realizar o deploy do contrato EVM
  const deployEvmContract = async () => {
    if (window.ethereum) {
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();
        const factory = new ContractFactory(
          MessageStorageArtifact.abi,
          MessageStorageArtifact.bytecode,
          signer
        );

        const contract = await factory.deploy("Hello from Solidity!");
        await contract.waitForDeployment();

        console.log("Contrato EVM implantado. Endereço: ", contract.target);
        alert("Contrato EVM implantado. Endereço: " + contract.target);

        setEvmContractAddress(contract.target.toString());
      } catch (e) {
        console.error("Deploy do contrato EVM falhou", e);
        alert("Deploy do contrato EVM falhou: " + e);
      }
    } else {
      alert("MetaMask não está instalado!");
    }
  };

  // Função para atualizar a mensagem no contrato EVM
  const updateEvmMessage = async () => {
    if (window.ethereum && evmContractAddress) {
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const signer = await provider.getSigner();
        const contract = new Contract(
          evmContractAddress,
          MessageStorageArtifact.abi,
          signer
        );

        const tx = await contract.updateMessage(newMessageValue);
        await tx.wait();

        console.log("Mensagem EVM atualizada. TX: ", tx.hash);
        alert("Mensagem EVM atualizada. TX: " + tx.hash);
      } catch (e) {
        console.error("Atualização da mensagem EVM falhou", e);
        alert("Atualização da mensagem EVM falhou: " + e);
      }
    } else {
      alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
    }
  };

  // Função para ler a mensagem armazenada no contrato EVM
  const readEvmMessage = async () => {
    if (window.ethereum && evmContractAddress) {
      try {
        const provider = new BrowserProvider(window.ethereum as any);
        const contract = new Contract(
          evmContractAddress,
          MessageStorageArtifact.abi,
          provider
        );

        const message = await contract.message();
        alert("Mensagem armazenada no contrato EVM: " + message);
      } catch (e) {
        console.error("Leitura da mensagem EVM falhou", e);
        alert("Leitura da mensagem EVM falhou: " + e);
      }
    } else {
      alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
    }
  };

  return (
    <>
      <div className={styles.containerLeft}>
        <section className={styles.section}>
          <h2 className={styles.h2Title}>
            Message Storage - BVM with sCrypt
          </h2>

          {!isBvmConnected ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px' }}>
                Private Key (hex):
                <input
                  type="password"
                  value={privateKeyHex}
                  onChange={(e) => setPrivateKeyHex(e.target.value)}
                  placeholder="Informe sua chave privada em hex"
                />
              </label>
            </div>
          ) : (
            <div className={styles.walletInfo}>
              <p style={{ fontSize: '14px', width: '100%', textAlign: 'center'}}>Public Key:</p>
              <p style={{ fontSize: '14px', width: '100%', wordWrap: 'break-word',overflowWrap: 'break-word', textAlign: 'center' }}>{publicKey}</p>
              <p style={{ fontSize: '14px' }}>Address:</p>
              <p style={{ fontSize: '14px' }}>{address}</p>
              <p style={{ fontSize: '14px' }}>Balance: {balance}</p>
            </div>
          )}

          {isBvmConnected ? null : <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button
              onClick={connectBvmWallet}
            >
              Connect Wallet
            </button>
          </div>}

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ fontSize: '14px' }}>
              Press Deploy to create the contract:
            </label>
            <br />
            <button
              className="insert"
              onClick={() => deployBvmContract(100)}
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
                Enter the new message value and press Update to update:
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
                onClick={updateBvmMessage}
                style={{ fontSize: '14px', padding: '5px', marginRight: '10px' }}
              >
                Update Message
              </button>
              <button
                className="insert"
                onClick={readBvmMessage}
                style={{ fontSize: '14px', padding: '5px' }}
              >
                Read Message
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className={styles.containerRight}>
        <section className={styles.section}>
          <h2 style={{ fontSize: '34px', paddingBottom: '5px', paddingTop: '5px' }}>
            Message Storage - EVM with Solidity
          </h2>

          {isEvmConnected ? (
            <div className={styles.walletInfo}>
              <p style={{ fontSize: '14px'}}>Address:</p>
              <p style={{ fontSize: '14px', width: '100%', wordWrap: 'break-word',overflowWrap: 'break-word', textAlign: 'center' }}>{evmAddress}</p>
              <p style={{ fontSize: '14px' }}>Balance: {evmBalance}</p>
            </div> ) : null
          }

          {isEvmConnected ? null : <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <button onClick={connectEvmWallet} >
              Connect Wallet
            </button>
          </div>}

          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ fontSize: '14px' }}>
              Press Deploy to create the contract:
            </label>
            <br />
            <button onClick={deployEvmContract}  >
              Deploy
            </button>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              {evmContractAddress ? (
                <p style={{ fontSize: '14px' }}>
                  Contract Address: <a href={`https://etherscan.io/address/${evmContractAddress}`} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  >{evmContractAddress}</a>
                </p>
              ) : null}
            </div>
            <div style={{ textAlign: 'center' }}>
              <label style={{ fontSize: '14px' }}>
                Enter the new message value and press Update to update:
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
              <button onClick={updateEvmMessage} >
                Update Message
              </button>
              <button onClick={readEvmMessage} >
                Read Message
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

export default Home;