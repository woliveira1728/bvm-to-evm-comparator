import { createContext, ReactNode, useContext, useState, useEffect, useRef } from "react";
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
import Timer from "../classes/Timer";


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
    const [transactionTime, setTransactionTime] = useState<string>('00:00:00.000');
    const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
    const timerRef = useRef<Timer | null>(null);
    
    // Inicia o timer
    const startTimer = () => {
        if (timerRef.current) {
            timerRef.current.stop();
        }
        
        timerRef.current = new Timer({
            onUpdate: (_, formattedTime) => {
                setTransactionTime(formattedTime);
            },
            onComplete: (totalTime, formattedTime) => {
                setTransactionTime(formattedTime);
                setIsTimerRunning(false);
            }
        });
        
        timerRef.current.start();
        setIsTimerRunning(true);
        setTransactionTime('00:00:00.000');
    };

    // Para o timer
    const stopTimer = () => {
        if (timerRef.current) {
            timerRef.current.stop();
            setIsTimerRunning(false);
        }
    };

    // Reseta o timer
    const resetTimer = () => {
        if (timerRef.current) {
            timerRef.current.reset();
            setTransactionTime('00:00:00.000');
            setIsTimerRunning(false);
        }
    };
    
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
        startTimer();
        // Verifica se a carteira BVM está conectada
        if (!isBvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira BVM primeiro!");
            return;
        }
        
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

            // Atualizar a interface do usuário com o novo TXID
            setTxid(deployTx.id);
            setBalance(balance.confirmed);

            stopTimer();
        } catch (e) {
            stopTimer();
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Deploy falhou: " + (e as Error).message);
            }
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Deploy falhou", e.message);
                alert("Deploy falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Deploy falhou", e);
                alert("Deploy falhou: " + e);
            }
        }
    };

    // Função para atualizar a mensagem no contrato (desplegar um novo contrato com a nova mensagem)
    const updateBvmMessage = async () => {
        startTimer();
        // Verifica se a carteira BVM está conectada
        if (!isBvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira BVM primeiro!");
            return;
        }

        try {
            const wallet = getBvmWallet();
            
            if (!newMessageBvmValue) {
                stopTimer();
                console.error("Nova mensagem não informada");
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
            stopTimer();
        } catch (e) {
            stopTimer();
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Atualização falhou: " + (e as Error).message);
            }

            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Atualização falhou", e.message);
                alert("Atualização falhou: " + e.message);
            } else {
                console.error("Atualização falhou", e);
                alert("Atualização falhou: " + e);
            }
        }
    };

    // Função para ler a mensagem armazenada no contrato
    const readBvmMessage = async () => {
        startTimer();

        try {
            if (!txid) {
                stopTimer();
                console.error("TXID não informado");
                alert("Por favor, informe um TXID válido!");
                return;
            }

            // Recupera a transação a partir do TXID informado
            const tx = await provider.getTransaction(txid);
            console.log("Transação recuperada:", tx.id);

            // Reconstrói a instância do contrato a partir da transação (assumindo que o estado está na saída 0)
            const instance = MessageStorageSCrypt.fromTx(tx, 0);
            if (!instance) {
                stopTimer();
                console.error("Falha ao reconstruir o contrato a partir do TX.");
                alert("Falha ao reconstruir o contrato a partir do TX.");
                return;
            }

            // Converte a mensagem de volta para string
            const messageHex = instance.message;
            const message = Buffer.from(messageHex, 'hex').toString('utf-8');
            
            alert("Mensagem armazenada: " + message);
            stopTimer();
        } catch (e) {
            stopTimer();
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Leitura da mensagem falhou: " + (e as Error).message);
            }
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Leitura da mensagem falhou", e.message);
                alert("Leitura da mensagem falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Leitura da mensagem falhou", e);
                alert("Leitura da mensagem falhou: " + e);
            }
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
        startTimer();
        if (!privateKeyEvm) {
            stopTimer();
            alert("Por favor, conecte-se à carteira EVM primeiro!");
            return;
        }

        // Tenta realizar o deploy do contrato EVM
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
                        console.log("Contrato EVM implantado. TX: ", deploymentTx.hash);
                        alert("Contrato EVM implantado. TX: " + deploymentTx.hash);
                        setEvmAddress(address);
                        setEvmCounterValue(0);
                        setEvmCounterTxHash("");
                        // Atualizar o saldo EVM
                        setEvmTxid(deploymentTx.hash);
                        setEvmBalance(ethers.formatEther(balance));
                        stopTimer();
                    } else {
                        stopTimer();
                        // Se a transação de implantação for nula ou indefinida, exibe um erro
                        console.error("Deployment transaction is null or undefined");
                        alert("Deployment transaction is null or undefined");
                    }
                } else {
                    stopTimer();
                    // Se a transação de implantação for nula ou indefinida, exibe um erro
                    console.error("Deployment transaction is null or undefined");
                    alert("Deployment transaction is null or undefined");
                }
            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante o deploy, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    alert("Deploy do contrato EVM falhou: " + (e as Error).message);
                }
                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Deploy do contrato EVM falhou", e.message);
                    alert("Deploy do contrato EVM falhou: " + e.message);
                } else {
                    // Se o erro não for uma instância de Error, loga o erro diretamente
                    console.error("Deploy do contrato EVM falhou", e);
                    alert("Deploy do contrato EVM falhou: " + e);
                }
            }
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada");
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }
    };

    // Função para atualizar a mensagem no contrato EVM
    const updateEvmMessage = async () => {
        startTimer();
        // Verifica se a carteira EVM está conectada
        if (!isEvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }
        
        // Tenta atualizar a mensagem no contrato EVM
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
                setEvmTxid(tx.hash);
                stopTimer();
            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante a atualização, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    alert("Atualização da mensagem EVM falhou: " + (e as Error).message);
                }
                // Log do erro para depuração
                if (e instanceof Error) {
                console.error("Atualização da mensagem EVM falhou", e.message);
                alert("Atualização da mensagem EVM falhou: " + e.message);
                } else {
                    // Se o erro não for uma instância de Error, loga o erro diretamente
                    console.error("Atualização da mensagem EVM falhou", e);
                    alert("Atualização da mensagem EVM falhou: " + e);
                }
            }
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada ou contrato não implantado");
            // Se a carteira EVM não estiver conectada ou o contrato não estiver implantado, exibe um erro
            console.error("Carteira EVM não conectada ou contrato não implantado");
            // Exibe um alerta para o usuário
            console.error("Carteira EVM não conectada ou contrato não implantado");
            alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
            return;
        }
    };

    // Função para ler a mensagem armazenada no contrato EVM
    const readEvmMessage = async () => {
        startTimer();
        // Verifica se a carteira EVM está conectada
        if (!isEvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }

        // Tenta ler a mensagem armazenada no contrato EVM
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
                console.log("Mensagem armazenada no contrato EVM:", message);
                alert("Mensagem armazenada no contrato EVM: " + message);
                stopTimer();
            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante a leitura, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    alert("Leitura da mensagem EVM falhou: " + (e as Error).message);
                }
                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Leitura da mensagem EVM falhou", e.message);
                    alert("Leitura da mensagem EVM falhou: " + e.message);
                } else {
                    // Se o erro não for uma instância de Error, loga o erro diretamente
                    console.error("Leitura da mensagem EVM falhou", e);
                    alert("Leitura da mensagem EVM falhou: " + e);
                }
            }
            
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada ou contrato não implantado");
            // Se a carteira EVM não estiver conectada ou o contrato não estiver implantado, exibe um erro
            console.error("Carteira EVM não conectada ou contrato não implantado");
            alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
            return;
        }
    };

    // Função para realizar o deploy do contrato counter no BVM
    const deployBvmContractCounter = async (amount: number) => {
        startTimer();
        if (!privateKeyHex) {
            stopTimer();
            alert("Por favor, conecte-se à carteira BVM primeiro!");
            return;
        }
        
        try {
            const wallet = getBvmWallet();
            const balance = await wallet.getBalance();
    
            if (balance.confirmed < amount) {
                stopTimer();
                console.error("Saldo insuficiente para realizar o deploy do contrato.");
                // Exibe um alerta para o usuário
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
            console.log("Contrato Counter implantado. TXID: ", deployTx.id);
            stopTimer();
        } catch (e) {
            stopTimer();
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Deploy falhou: " + (e as Error).message);
            }
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Deploy falhou", e.message);
                alert("Deploy falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Deploy falhou", e);
                alert("Deploy falhou: " + e);
            }
        }
    };

    // Função para incrementar o contador no contrato CounterSCrypt
    const incrementCounter = async () => {
        startTimer();
        try {
            const wallet = getBvmWallet();
            
            if (!counterTxid) {
                stopTimer();
                console.error("Counter contract not deployed yet.");
                // Exibe um alerta para o usuário
                alert("Por favor, implante o contrato Counter primeiro!");
                return;
            }
            
            if (counterValue === null) {
                stopTimer();
                console.error("Counter value is null. Please deploy the contract first.");
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
            console.log("Contador incrementado. TXID: ", deployTx.id);
            stopTimer();
        } catch (e) {
            stopTimer();
            // Se ocorrer um erro durante o incremento, exibe uma mensagem de erro
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Incremento do contador falhou: " + (e as Error).message);
            }
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Incremento do contador falhou", e.message);
                alert("Incremento do contador falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Incremento do contador falhou", e);
                alert("Incremento do contador falhou: " + e);
            }
            
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Incremento do contador falhou: " + (e as Error).message);
            }
        }
    };

    // Função para decrementar o contador no contrato CounterSCrypt
    const decrementCounter = async () => {
        startTimer();
        try {
            const wallet = getBvmWallet();
            
            if (!counterTxid) {
                stopTimer();
                console.error("Counter contract not deployed yet.");
                // Exibe um alerta para o usuário
                alert("Por favor, implante o contrato Counter primeiro!");
                return;
            }
            
            if (counterValue === null) {
                stopTimer();
                console.error("Counter value is null. Please deploy the contract first.");
                // Exibe um alerta para o usuário
                alert("Counter value is null. Please deploy the contract first.");
                return;
            }

            const increment = counterValue - 1n;
            
            const instance = new CounterSCrypt(increment);
            await instance.connect(wallet);
            const deployTx = await instance.deploy(100);
            const balance = await wallet.getBalance();

            console.log("Contador decrementado. TXID: ", deployTx.id);
            stopTimer();
        
            // Atualizar o valor do contador
            setCounterTxid(deployTx.id);
            setCounterValue(instance.counter);
            setBvmBalance(balance.confirmed);
        } catch (e) {
            stopTimer();
            // Se ocorrer um erro durante o decremento, exibe uma mensagem de erro
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Decremento do contador falhou: " + (e as Error).message);
            }
            
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Decremento do contador falhou", e.message);
                alert("Decremento do contador falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Decremento do contador falhou", e);
                alert("Decremento do contador falhou: " + e);
            }

            // Se a mensagem de erro contiver "Request has been terminated", exibe um alerta específico
            if ((e as Error).message.includes("Request has been terminated")) {
                console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                // Exibe um alerta para o usuário
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                // Se a mensagem de erro não contiver "Request has been terminated", exibe um alerta genérico
                console.error("Decremento do contador falhou", e);
                alert("Decremento do contador falhou: " + (e as Error).message);
            }
        }
    };

    // Função para ler o valor atual do contador
    const readCounter = async () => {
        try {
            if (!counterTxid) {
                stopTimer();
                console.error("Counter contract not deployed yet.");
                alert("Por favor, implante o contrato Counter primeiro!");
                return;
            }
        
            // Recupera a transação a partir do TXID informado
            const tx = await provider.getTransaction(counterTxid);
        
            // Reconstrói a instância do contrato a partir da transação (assumindo que o estado está na saída 0)
            const instance = CounterSCrypt.fromTx(tx, 0);
            if (!instance) {
                console.error("Falha ao reconstruir o contrato Counter a partir do TX.");
                alert("Falha ao reconstruir o contrato Counter a partir do TX.");
                return;
            }
        
            // Atualizar o valor do contador
            setCounterValue(instance.counter);
        } catch (e) {
            // Se ocorrer um erro durante a leitura, exibe uma mensagem de erro
            if ((e as Error).message.includes("Request has been terminated")) {
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                alert("Leitura do contador falhou: " + (e as Error).message);
            }
            // Log do erro para depuração
            if (e instanceof Error) {
                console.error("Leitura do contador falhou", e.message);
                alert("Leitura do contador falhou: " + e.message);
            } else {
                // Se o erro não for uma instância de Error, loga o erro diretamente
                console.error("Leitura do contador falhou", e);
                alert("Leitura do contador falhou: " + e);
            }
            // Se a mensagem de erro contiver "Request has been terminated", exibe um alerta específico
            if ((e as Error).message.includes("Request has been terminated")) {
                console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                // Exibe um alerta para o usuário
                alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
            } else {
                // Se a mensagem de erro não contiver "Request has been terminated", exibe um alerta genérico
                console.error("Leitura do contador falhou", e);
                alert("Leitura do contador falhou: " + (e as Error).message);
            }
            console.error("Leitura do contador falhou", e);
            alert("Leitura do contador falhou: " + (e as Error).message);
        }
    };

    // Função para realizar o deploy do contrato EVM
    const deployEvmContractCounter = async () => {
        startTimer();
        if (!privateKeyEvm) {
            stopTimer();
            alert("Por favor, conecte-se à carteira EVM primeiro!");
            return;
        }
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
                        console.log("Contrato EVM Counter implantado. TX: ", deploymentTx.hash);
                        stopTimer();
                    } else {
                        stopTimer();
                        // Se a transação de implantação for nula ou indefinida, exibe um erro
                        console.error("Deployment transaction is null or undefined");
                        alert("Deployment transaction is null or undefined");
                    }
                } else {
                    stopTimer();
                    // Se a transação de implantação for nula ou indefinida, exibe um erro
                    console.error("Deployment transaction is null or undefined");
                    alert("Deployment transaction is null or undefined");
                }

            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante o deploy, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    alert("Deploy do contrato EVM falhou: " + (e as Error).message);
                }
                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Deploy do contrato EVM falhou", e.message);
                    alert("Deploy do contrato EVM falhou: " + e.message);
                } else {
                    // Se o erro não for uma instância de Error, loga o erro diretamente
                    console.error("Deploy do contrato EVM falhou", e);
                    alert("Deploy do contrato EVM falhou: " + e);
                }
            }
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada");
            // Se a carteira EVM não estiver conectada, exibe um erro
            console.error("Carteira EVM não conectada");
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }
    };

    const incrementEvmCounter = async () => {
        startTimer();
        // Verifica se a carteira EVM está conectada
        if (!isEvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }
        
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
                console.log("Contador EVM incrementado. TX: ", tx.hash);
                stopTimer();
            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante o incremento, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Incremento do contador EVM falhou", e);
                    alert("Incremento do contador EVM falhou: " + (e as Error).message);
                }
                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Incremento do contador EVM falhou", e.message);
                    alert("Incremento do contador EVM falhou: " + e.message);
                } else {
                    console.error("Incremento do contador EVM falhou", e);
                    alert("Incremento do contador EVM falhou: " + e);
                }
                // Se a mensagem de erro contiver "Request has been terminated", exibe um alerta específico
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Incremento do contador EVM falhou", e);
                    alert("Incremento do contador EVM falhou: " + (e as Error).message);
                }
            }
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada ou contrato não implantado");
            alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
            return;
        }
    };

    const decrementEvmCounter = async () => {
        startTimer();
        // Verifica se a carteira EVM está conectada
        if (!isEvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }

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
                console.log("Contador EVM decrementado. TX: ", tx.hash);
                stopTimer();
            } catch (e) {
                stopTimer();
                // Se ocorrer um erro durante o decremento, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Decremento do contador EVM falhou", e);
                    alert("Decremento do contador EVM falhou: " + (e as Error).message);
                }

                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Decremento do contador EVM falhou", e.message);
                    alert("Decremento do contador EVM falhou: " + e.message);
                } else {
                    console.error("Decremento do contador EVM falhou", e);
                    alert("Decremento do contador EVM falhou: " + e);
                }

                // Se a mensagem de erro contiver "Request has been terminated", exibe um alerta específico
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Decremento do contador EVM falhou", e);
                    alert("Decremento do contador EVM falhou: " + (e as Error).message);
                }
            }
        } else {
            stopTimer();
            console.error("Carteira EVM não conectada ou contrato não implantado");
            alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
            return;
        }
    };

    const readEvmCounter = async () => {
        // Verifica se a carteira EVM está conectada
        if (!isEvmConnected) {
            stopTimer();
            alert("Conecte-se à carteira EVM primeiro!");
            return;
        }
        
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
                console.log("Valor do contador EVM lido:", counterValue);
            } catch (e) {
                // Se ocorrer um erro durante a leitura, exibe uma mensagem de erro
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Leitura do contador EVM falhou", e);
                    alert("Leitura do contador EVM falhou: " + e);
                }

                // Log do erro para depuração
                if (e instanceof Error) {
                    console.error("Leitura do contador EVM falhou", e.message);
                    alert("Leitura do contador EVM falhou: " + e.message);
                } else {
                    // Se o erro não for uma instância de Error, loga o erro diretamente
                    console.error("Leitura do contador EVM falhou", e);
                    alert("Leitura do contador EVM falhou: " + e);
                }

                // Se a mensagem de erro contiver "Request has been terminated", exibe um alerta específico
                if ((e as Error).message.includes("Request has been terminated")) {
                    console.error("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                    alert("Erro de rede: a solicitação foi interrompida. Verifique sua conexão de rede e tente novamente.");
                } else {
                    console.error("Leitura do contador EVM falhou", e);
                    alert("Leitura do contador EVM falhou: " + (e as Error).message);
                }
            }
        } else {
            console.error("Carteira EVM não conectada ou contrato não implantado");
            alert("Conecte-se à carteira EVM e implante o contrato primeiro!");
            return;
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
                transactionTime,
                isTimerRunning,
                startTimer,
                stopTimer,
                resetTimer,
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