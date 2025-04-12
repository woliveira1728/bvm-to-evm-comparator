import { createContext, ReactNode, useContext, useState } from "react";
import { UserContextType } from "./interfaces";
import { Buffer } from 'buffer';
import styles from "./style.module.scss";
import { MessageStorageSCrypt } from "../contracts/MessageStorageSCrypt";
import { CounterSCrypt } from '../contracts/CounterSCrypt';
import { ethers, BrowserProvider, ContractFactory, Contract, Wallet, JsonRpcProvider } from "ethers";
import MessageStorageArtifact from "../artifacts/MessageStorage.json";
import CounterArtifact from "../artifacts/CounterEvm.json";
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

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
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
    const [counterTxid, setCounterTxid] = useState("");
    const [counterValue, setCounterValue] = useState<bigint | null>(null);
    const [bvmBalance, setBvmBalance] = useState(0);
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
        
        // Converte a mensagem inicial para hexadecimal
        const initialMessage = toHex(Buffer.from("Hello from sCrypt!").toString('hex'));
        const address = await wallet.getDefaultAddress();
        const ownerPubKey = await wallet.getPubKey(address);
        const instance = new MessageStorageSCrypt(initialMessage, PubKey(toHex(ownerPubKey)));
        
        await instance.connect(wallet);
        const deployTx = await instance.deploy(amount);
        const balance = await wallet.getBalance();

        console.log("Contrato implantado. TXID: ", deployTx.id);
        alert("Contrato implantado. TXID: " + deployTx.id);

        // Atualizar a interface do usuário com o novo TXID
        setTxid(deployTx.id);
        setBalance(balance.confirmed);
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
        const deployTx = await instance.deploy(100);
        const balance = await wallet.getBalance();

        console.log("Mensagem atualizada. TXID: ", deployTx.id);
        alert("Mensagem atualizada. TXID: " + deployTx.id);

        // Atualizar a interface do usuário com o novo TXID
        setTxid(deployTx.id);
        setBalance(balance.confirmed);
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
            const address = await wallet.getAddress();
            const balance = await provider.getBalance(address);
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
                setEvmBalance(ethers.formatEther(balance));
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
            const address = await wallet.getAddress();
            const balance = await provider.getBalance(address);
            const contract = new Contract(
            evmContractAddress,
            MessageStorageArtifact.abi,
            wallet
            );

            const tx = await contract.updateMessage(newMessageEvmValue);
            await tx.wait();

            console.log("Mensagem EVM atualizada. TX: ", tx.hash);
            alert("Mensagem EVM atualizada. TX: " + tx.hash);
            setEvmBalance(ethers.formatEther(balance));
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

    // Função para realizar o deploy do contrato counter no BVM
    const deployBvmContractCounter = async (amount: number) => {
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
          const balance2 = await wallet.getBalance();
          
          // Atualizar a interface do usuário com o novo TXID
          setCounterTxid(deployTx.id);
          setCounterValue(instance.counter);
          setBvmBalance(balance2.confirmed);
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
          const balance = await wallet.getBalance();
    
          // Atualizar o valor do contador
          await setCounterTxid(deployTx.id);
          await setCounterValue(instance.counter);
          setBvmBalance(balance.confirmed);
        } catch (e) {
          console.error("Incremento do contador falhou", e);
          if ((e as Error).message.includes("Request has been terminated")) {
            alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
          } else {
            alert("Incremento do contador falhou: " + (e as Error).message);
          }
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
          const balance = await wallet.getBalance();
    
          // Atualizar o valor do contador
          setCounterTxid(deployTx.id);
          setCounterValue(instance.counter);
          setBvmBalance(balance.confirmed);
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

    // Função para realizar o deploy do contrato EVM
    const deployEvmContractCounter = async () => {
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
                const address = await wallet.getAddress();
                const balance = await provider.getBalance(address);
                setEvmBalance(ethers.formatEther(balance));
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
            const address = await wallet.getAddress();
            const balance = await provider.getBalance(address);
            setEvmBalance(ethers.formatEther(balance));
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
        
                const tx = await contract.decrement();
                await tx.wait();
        
                setEvmCounterTxHash(tx.hash);
        
                // Atualizar o valor do contador após a transação
                const newCounterValue = await contract.getCounter();
                setEvmCounterValue(Number(newCounterValue));
                const address = await wallet.getAddress();
                const balance = await provider.getBalance(address);
                setEvmBalance(ethers.formatEther(balance));
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
        <UserContext.Provider
            value={{
                privateKeyHex,
                setPrivateKeyHex,
                privateKeyEvm,
                setPrivateKeyEvm,
                newMessageBvmValue,
                setNewMessageBvmValue,
                newMessageEvmValue,
                setNewMessageEvmValue,
                publicKey,
                setPublicKey,
                address,
                setAddress,
                balance,
                setBalance,
                isBvmConnected,
                setIsBvmConnected,
                isEvmConnected,
                setIsEvmConnected,
                txid,
                setTxid,
                evmAddress,
                setEvmAddress,
                evmBalance,
                setEvmBalance,
                evmContractAddress,
                setEvmContractAddress,
                evmTxid,
                setEvmTxid,
                connectBvmWallet, 
                deployBvmContract, 
                updateBvmMessage, 
                readBvmMessage, 
                connectEvmWallet, 
                deployEvmContract, 
                updateEvmMessage, 
                readEvmMessage,
                baseUrlBscscan,
                baseUrlWhatsOnChain,
                incrementCounter,
                decrementCounter,
                readCounter,
                deployBvmContractCounter,
                deployEvmContractCounter,
                incrementEvmCounter,
                decrementEvmCounter,
                readEvmCounter,
                evmCounterValue,
                setEvmCounterValue,
                evmCounterTxHash,
                setEvmCounterTxHash,
                counterValue,
                counterTxid,
            }}
        >
        {children}
        </UserContext.Provider>
    );
};

export const useUser = () => {
    const context = useContext(UserContext);
    if (context === undefined) {
      throw new Error("useAuth deve ser usado dentro de AuthProvider");
    }
    return context;
};