import React, { useRef, useState } from 'react';
import { Buffer } from 'buffer';
import styles from "./style.module.scss";
import { MessageStorageSCrypt } from "../../contracts/MessageStorageSCrypt";
import { ethers, BrowserProvider, ContractFactory, Contract, Wallet, JsonRpcProvider } from "ethers";
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
  const [privateKeyEvm, setPrivateKeyEvm] = useState("");
  const [newMessageBvmValue, setNewMessageBvmValue] = useState("");
  const [newMessageEvmValue, setNewMessageEvmValue] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [isBvmConnected, setIsBvmConnected] = useState(false);
  const [isEvmConnected, setIsEvmConnected] = useState(false);
  const [txid, setTxid] = useState("");
  const [evmAddress, setEvmAddress] = useState("");
  const [evmBalance, setEvmBalance] = useState("");
  const [evmContractAddress, setEvmContractAddress] = useState("");
  const [evmTxid, setEvmTxid] = useState("");
  const baseUrlWhatsOnChain = 'https://test.whatsonchain.com/tx/';
  const baseUrlBscscan = 'https://testnet.bscscan.com/';

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

      if (!newMessageBvmValue) {
        alert("Por favor, informe o novo valor da mensagem!");
        return;
      }

      // Converte a nova mensagem para hexadecimal
      const newMessage = toHex(Buffer.from(newMessageBvmValue).toString('hex'));

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
      let privateKey = privateKeyEvm.trim();
  
      // Remove o prefixo '0x' se presente
      if (privateKey.startsWith("0x")) {
        privateKey = privateKey.substring(2);
      }
  
      // Verifica se a chave privada tem 64 caracteres hexadecimais
      if (privateKey.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(privateKey)) {
        alert("Chave privada inválida. A chave privada deve ter 64 caracteres hexadecimais.");
        return;
      }
  
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKey, provider);
        const address = await wallet.getAddress();
  
        // Verifica se o endereço foi obtido corretamente
        if (!address) {
            throw new Error("Endereço da carteira não encontrado.");
        }
  
        const balance = await provider.getBalance(address);
  
        // Verifica se o saldo não é vazio
        if (balance === BigInt(0)) {
            alert("Saldo da carteira é zero.");
            return;
        }
  
        // Verifica se o saldo está sendo retornado corretamente
        const formattedBalance = ethers.formatEther(balance);
        if (!formattedBalance || formattedBalance === "0") {
            alert("Erro ao formatar o saldo da carteira.");
            return;
        }
  
        setEvmAddress(address);
        setEvmBalance(formattedBalance);
        setIsEvmConnected(true);
  
        console.log("Carteira conectada:", address);
        console.log("Saldo:", formattedBalance);
      } catch (e) {
        console.error("Conexão com a carteira EVM falhou", e);
        alert("Conexão com a carteira EVM falhou: " + e);
      }
    };

  // Função para realizar o deploy do contrato EVM
  const deployEvmContract = async () => {
    if (isEvmConnected) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const factory = new ContractFactory(
          MessageStorageArtifact.abi,
          MessageStorageArtifact.bytecode,
          wallet
        );

        const contract = await factory.deploy("Hello from Solidity!");
        const tx = await contract.waitForDeployment();

        setEvmContractAddress(contract.target.toString());
        if (tx && tx.deploymentTransaction()) {
          const deploymentTx = tx.deploymentTransaction();
          if (deploymentTx) {
            setEvmTxid(deploymentTx.hash);
          } else {
            console.error("Deployment transaction is null or undefined");
            alert("Deployment transaction is null or undefined");
          }
        } else {
          console.error("Deployment transaction is null or undefined");
          alert("Deployment transaction is null or undefined");
        }
      } catch (e) {
        console.error("Deploy do contrato EVM falhou", e);
        alert("Deploy do contrato EVM falhou: " + e);
      }
    } else {
      alert("Conecte-se à carteira EVM primeiro!");
    }
  };

  // Função para atualizar a mensagem no contrato EVM
  const updateEvmMessage = async () => {
    if (isEvmConnected && evmContractAddress) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const contract = new Contract(
          evmContractAddress,
          MessageStorageArtifact.abi,
          wallet
        );

        const tx = await contract.updateMessage(newMessageEvmValue);
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
    if (isEvmConnected && evmContractAddress) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const contract = new Contract(
          evmContractAddress,
          MessageStorageArtifact.abi,
          wallet
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
                value={newMessageBvmValue}
                onChange={(e) => setNewMessageBvmValue(e.target.value)}
                placeholder="Informe o novo valor da mensagem"
                style={{ fontSize: '14px', padding: '5px', width: '400px' }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                onClick={updateBvmMessage}
                style={{ fontSize: '14px', padding: '5px', marginRight: '10px' }}
              >
                Update Message
              </button>
              <button
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

          {!isEvmConnected ? (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px' }}>
                Private Key (hex):
                <input
                  type="password"
                  value={privateKeyEvm}
                  onChange={(e) => setPrivateKeyEvm(e.target.value)}
                  placeholder="Informe sua chave privada em hex"
                />
              </label>
            </div>
          ) : (
            <div className={styles.walletInfo}>
              <p style={{ fontSize: '14px' }}>Address:</p>
              <p style={{ fontSize: '14px' }}>{evmAddress}</p>
              <p style={{ fontSize: '14px' }}>Balance: {evmBalance}</p>
            </div>
          )}

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
              {evmTxid ? (
                <p style={{ fontSize: '14px' }}>
                  TXID:{" "} <a href={`${baseUrlBscscan}tx/${evmTxid}`} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  >{evmTxid}</a>
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
                value={newMessageEvmValue}
                onChange={(e) => setNewMessageEvmValue(e.target.value)}
                placeholder="Informe o novo valor da mensagem"
                style={{ fontSize: '14px', padding: '5px', width: '400px' }}
              />
            </div>
            <div style={{ textAlign: 'center', marginTop: '10px' }}>
              <button
                onClick={updateEvmMessage}
                style={{ fontSize: '14px', padding: '5px', marginRight: '10px' }}
              >
                Update Message
              </button>
              <button
                onClick={readEvmMessage}
                style={{ fontSize: '14px', padding: '5px' }}
              >
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