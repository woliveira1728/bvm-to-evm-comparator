import React, { useRef, useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import styles from "./style.module.scss";
import { CounterSCrypt } from '../../contracts/CounterSCrypt';
import { ethers, BrowserProvider, ContractFactory, Contract, Wallet, JsonRpcProvider } from "ethers";
import CounterArtifact from "../../artifacts/CounterEvm.json";
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
import * as dotenv from 'dotenv';

const provider = new DefaultProvider({network: bsv.Networks.testnet});
let Alice: TestWallet;

function Counter() {
  const [privateKeyHex, setPrivateKeyHex] = useState("");
  const [privateKeyEvm, setPrivateKeyEvm] = useState("");
  const [bvmPublicKey, setBvmPublicKey] = useState("");
  const [bvmAddress, setBvmAddress] = useState("");
  const [bvmBalance, setBvmBalance] = useState(0);
  const [isBvmConnected, setIsBvmConnected] = useState(false);
  const [isEvmConnected, setIsEvmConnected] = useState(false);
  const [counterTxid, setCounterTxid] = useState("");
  const [counterValue, setCounterValue] = useState<bigint | null>(null);
  const [evmAddress, setEvmAddress] = useState("");
  const [evmBalance, setEvmBalance] = useState("");
  const [evmContractAddress, setEvmContractAddress] = useState("");
  const [evmTxid, setEvmTxid] = useState("");
  const baseUrlWhatsOnChain = 'https://test.whatsonchain.com/tx/';
  const baseUrlBscscan = 'https://testnet.bscscan.com/';
  const [evmCounterValue, setEvmCounterValue] = useState<number | null>(null);
  const [evmCounterTxHash, setEvmCounterTxHash] = useState<string>("");

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

      setBvmPublicKey(publicKey.toString());
      setBvmAddress(address.toString());
      setBvmBalance(balance.confirmed);
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

      if (balance.confirmed < amount) {
        alert("Saldo insuficiente para realizar o deploy do contrato.");
        return;
      }

      const instance = new CounterSCrypt(0n);

      await instance.connect(wallet);
      const deployTx = await instance.deploy(amount);

      // Atualizar a interface do usuário com o novo TXID
      setCounterTxid(deployTx.id);
      setCounterValue(instance.counter);
    } catch (e) {
      console.error("Deploy falhou", e);
      alert("Deploy falhou: " + e);
    }
  };

  // Função para incrementar o contador no contrato CounterSCrypt
  const incrementCounter = async () => {
    try {
      const wallet = getBvmWallet();

      if (!counterTxid) {
        alert("Por favor, implante o contrato Counter primeiro!");
        return;
      }

      if (counterValue === null) {
        alert("Counter value is null. Please deploy the contract first.");
        return;
      }
      const increment = counterValue + 1n;

      const instance = new CounterSCrypt(increment);
      await instance.connect(wallet);
      const deployTx = await instance.deploy(100);

      // Atualizar o valor do contador
      await setCounterTxid(deployTx.id);
      await setCounterValue(instance.counter);
    } catch (e) {
      console.error("Incremento do contador falhou", e);
      if ((e as Error).message.includes("Request has been terminated")) {
        alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
      } else {
        alert("Incremento do contador falhou: " + (e as Error).message);
      }
    }
  };

  // Função para incrementar x vezes de uma vez só
  const incrementBvmCounterMultiple = async (x: number) => {
    for(let i = 0; i < x; i++) {
      await incrementCounter();
    }
  };

  // Função para decrementar o contador no contrato CounterSCrypt
  const decrementCounter = async () => {
    try {
      const wallet = getBvmWallet();

      if (!counterTxid) {
        alert("Por favor, implante o contrato Counter primeiro!");
        return;
      }

      if (counterValue === null) {
        alert("Counter value is null. Please deploy the contract first.");
        return;
      }
      const increment = counterValue - 1n;

      const instance = new CounterSCrypt(increment);
      await instance.connect(wallet);
      const deployTx = await instance.deploy(100);

      // Atualizar o valor do contador
      setCounterTxid(deployTx.id);
      setCounterValue(instance.counter);
    } catch (e) {
      console.error("Decremento do contador falhou", e);
      if ((e as Error).message.includes("Request has been terminated")) {
        alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
      } else {
        alert("Decremento do contador falhou: " + (e as Error).message);
      }
    }
  };

  // Função para ler o valor atual do contador
  const readCounter = async () => {
    try {
      if (!counterTxid) {
        alert("Por favor, implante o contrato Counter primeiro!");
        return;
      }

      // Recupera a transação a partir do TXID informado
      const tx = await provider.getTransaction(counterTxid);

      // Reconstrói a instância do contrato a partir da transação (assumindo que o estado está na saída 0)
      const instance = CounterSCrypt.fromTx(tx, 0);
      if (!instance) {
        alert("Falha ao reconstruir o contrato Counter a partir do TX.");
        return;
      }

      // Atualizar o valor do contador
      setCounterValue(instance.counter);
    } catch (e) {
      console.error("Leitura do contador falhou", e);
      if ((e as Error).message.includes("Request has been terminated")) {
        alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
      } else {
        alert("Leitura do contador falhou: " + (e as Error).message);
      }
    }
  };

  // Atualizar o valor do contador ao montar o componente
  useEffect(() => {
    if (counterTxid) {
      readCounter();
    }
  }, [counterTxid]);

  useEffect(() => {
    if (evmCounterTxHash) {
      readEvmCounter();
    }
  }, [evmCounterTxHash]);

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
          CounterArtifact.abi,
          CounterArtifact.bytecode,
          wallet
        );

        const contract = await factory.deploy(0);
        const tx = await contract.waitForDeployment();

        setEvmContractAddress(contract.target.toString());
        if (tx && tx.deploymentTransaction()) {
          const deploymentTx = tx.deploymentTransaction();
          if (deploymentTx) {
            setEvmTxid(deploymentTx.hash);
            setEvmCounterValue(0);
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

  const incrementEvmCounter = async () => {
    if (isEvmConnected && evmContractAddress) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const contract = new Contract(
          evmContractAddress,
          CounterArtifact.abi,
          wallet
        );

        const tx = await contract.increment();
        await tx.wait();

        setEvmCounterTxHash(tx.hash);

        // Atualizar o valor do contador após a transação
        const newCounterValue = await contract.getCounter();
        setEvmCounterValue(Number(newCounterValue));
      } catch (e) {
        console.error("Incremento do contador falhou", e);
        alert("Incremento do contador falhou: " + e);
      }
    } else {
      alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
    }
  };

  const decrementEvmCounter = async () => {
    if (isEvmConnected && evmContractAddress) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const contract = new Contract(
          evmContractAddress,
          CounterArtifact.abi,
          wallet
        );

        // Verifique o valor atual do contador antes de decrementar
        const currentCounterValue = await contract.getCounter();
        if (currentCounterValue <= 0) {
          alert("O valor do contador já é zero. Não é possível decrementar.");
          return;
        }

        const tx = await contract.decrement();
        await tx.wait();

        setEvmCounterTxHash(tx.hash);

        // Atualizar o valor do contador após a transação
        const newCounterValue = await contract.getCounter();
        setEvmCounterValue(Number(newCounterValue));
      } catch (e) {
        console.error("Decremento do contador falhou", e);
        alert("Decremento do contador falhou: " + e);
      }
    } else {
      alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
    }
  };

  const readEvmCounter = async () => {
    if (isEvmConnected && evmContractAddress) {
      try {
        const provider = new JsonRpcProvider("https://data-seed-prebsc-1-s1.binance.org:8545");
        const wallet = new Wallet(privateKeyEvm, provider);
        const contract = new Contract(
          evmContractAddress,
          CounterArtifact.abi,
          wallet
        );

        const counterValue = await contract.getCounter();
        setEvmCounterValue(Number(counterValue));
      } catch (e) {
        console.error("Leitura do contador EVM falhou", e);
        alert("Leitura do contador EVM falhou: " + e);
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
            Counter - BVM with sCrypt
          </h2>

          {!isBvmConnected ? (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '14px', textAlign: 'center' }}>
                Private Key (hex):
                <br />
                <br />
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
              <p style={{ fontSize: '14px', width: '100%', wordWrap: 'break-word',overflowWrap: 'break-word', textAlign: 'center' }}>{bvmPublicKey}</p>
              <p style={{ fontSize: '14px' }}>Address:</p>
              <p style={{ fontSize: '14px' }}>{bvmAddress}</p>
              <p style={{ fontSize: '14px' }}>Balance: {bvmBalance}</p>
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

          <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className="insert"
              onClick={decrementCounter}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Decrement
            </button>
            {counterValue !== null && (
                <p style={{ fontSize: '20px' }}>{counterValue.toString()}</p>
            )}
            <button
              className="insert"
              onClick={incrementCounter}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Increment
            </button>
          </div>

          {counterTxid && (
            <p style={{ fontSize: '14px', marginTop: '20px' }}>
              TXID: <a href={`${baseUrlWhatsOnChain}${counterTxid}`} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', color: 'inherit' }}
              >{counterTxid}</a>
            </p>
          )}

<div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className="insert"
              onClick={() => incrementBvmCounterMultiple(10)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 10x
            </button>
            
            <button
              className="insert"
              onClick={() => incrementBvmCounterMultiple(50)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 50x
            </button>

            <button
              className="insert"
              onClick={() => incrementBvmCounterMultiple(100)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 100x
            </button>
          </div>
        </section>
      </div>

      <div className={styles.containerRight}>
        <section className={styles.section}>
          <h2 style={{ fontSize: '34px', paddingBottom: '5px', paddingTop: '5px' }}>
            Counter - EVM with Solidity
          </h2>

          {!isEvmConnected ? (
            <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ fontSize: '14px', textAlign: 'center' }}>
                Private Key (hex):
                <br />
                <br />
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

          <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
            <button
              onClick={decrementEvmCounter}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Decrement
            </button>
            {evmCounterValue !== null && (
              <p style={{ fontSize: '20px' }}>{evmCounterValue.toString()}</p>
            )}
            <button
              onClick={incrementEvmCounter}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Increment
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '10px' }}>
              {evmTxid ? (
                <p style={{ fontSize: '14px' }}>
                  TXID: <a href={`${baseUrlBscscan}tx/${evmTxid}`} target="_blank" rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                  >{evmTxid}</a>
                </p>
              ) : null}
            </div>
        </section>
      </div>
    </>
  );
}

export default Counter;