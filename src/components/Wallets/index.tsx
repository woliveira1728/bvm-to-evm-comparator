import { useUser } from "../../providers/UserContext";
import styles from "./style.module.scss";

function Wallets() {
    const {
      isBvmConnected,
      isEvmConnected,
      privateKeyHex,
      setPrivateKeyHex,
      connectBvmWallet,
      publicKey,
      address,
      balance,
      privateKeyEvm,
      setPrivateKeyEvm,
      connectEvmWallet,
      evmAddress,
      evmBalance
    } = useUser();


    return (
        <main className={styles.main}>
          <div className={styles.containerLeft}>
            <section className={styles.section}>
              <h2 className={styles.h2Title}>
                Message Storage
              </h2>
              <h2 className={styles.h2Title}>
                BVM with sCrypt
              </h2>
    
              {!isBvmConnected ? (
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems:  'center', justifyContent: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px' }}>
                        Private Key (hex):
                    </label>
                    <input
                      type="password"
                      value={privateKeyHex}
                      onChange={(e) => setPrivateKeyHex(e.target.value)}
                      placeholder="Informe sua chave privada em hex"
                    />
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
            </section>
          </div>
    
          <div className={styles.containerRight}>
            <section className={styles.section}>
              <h2 className={styles.h2Title}>
                Message Storage
              </h2>
              <h2 className={styles.h2Title}>
                EVM with Solidity
              </h2>
    
              {!isEvmConnected ? (
                <div style={{ marginBottom: '20px', display: 'flex', flexDirection: 'column', alignItems:  'center', justifyContent: 'center', gap: '10px' }}>
                    <label style={{ fontSize: '14px' }}>
                        Private Key (hex):
                    </label>
                    <input
                      type="password"
                      value={privateKeyEvm}
                      onChange={(e) => setPrivateKeyEvm(e.target.value)}
                      placeholder="Informe sua chave privada em hex"
                    />
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
            </section>
          </div>
        </main>
    );
};

export default Wallets;