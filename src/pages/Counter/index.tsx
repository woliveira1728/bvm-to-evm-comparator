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
import { useUser } from "../../providers/UserContext";

const provider = new DefaultProvider({network: bsv.Networks.testnet});
let Alice: TestWallet;

function Counter() {
  const {
    incrementCounter,
    decrementCounter,
    readCounter,
    deployBvmContractCounter,
    deployEvmContractCounter,
    incrementEvmCounter,
    decrementEvmCounter,
    readEvmCounter,
    baseUrlWhatsOnChain,
    baseUrlBscscan,
    evmCounterTxHash,
    evmCounterValue,
    evmTxid,
    counterValue,
    counterTxid
  } = useUser();

  
  const incrementBvmCounterMultiple = async (x: number) => {
    for(let i = 1; i <= x; i++) {
      await incrementCounter();
    }
  };

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

  const incrementEvmCounterMultiple = async (x: number) => {
    for(let i = 1; i <= x; i++) {
      await incrementEvmCounter();
    }
  };

  return (
    <>
      <div className={styles.containerLeft}>
        <section className={styles.section}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ fontSize: '14px' }}>
              Press Deploy to create the contract:
            </label>
            <br />
            <button
              className="insert"
              onClick={() => deployBvmContractCounter(100)}
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
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <label style={{ fontSize: '14px' }}>
              Press Deploy to create the contract:
            </label>
            <br />
            <button onClick={deployEvmContractCounter}  >
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

            <div style={{ textAlign: 'center', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center', justifyContent: 'center' }}>
            <button
              className="insert"
              onClick={() => incrementEvmCounterMultiple(10)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 10x
            </button>
            
            <button
              className="insert"
              onClick={() => incrementEvmCounterMultiple(50)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 50x
            </button>

            <button
              className="insert"
              onClick={() => incrementEvmCounterMultiple(100)}
              style={{ fontSize: '14px', padding: '5px', marginTop: '10px' }}
            >
              Atack 100x
            </button>
          </div>
        </section>
      </div>
    </>
  );
}

export default Counter;