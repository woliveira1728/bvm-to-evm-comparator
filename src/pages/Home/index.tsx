import styles from "./style.module.scss";
import { useUser } from "../../providers/UserContext";

function Home() {
  const {
    deployBvmContract,
    txid,
    baseUrlWhatsOnChain,
    newMessageBvmValue,
    setNewMessageBvmValue,
    updateBvmMessage,
    readBvmMessage,
    deployEvmContract,
    evmTxid,
    baseUrlBscscan,
    newMessageEvmValue,
    setNewMessageEvmValue,
    updateEvmMessage,
    readEvmMessage,
  } = useUser();

  return (
    <main className={styles.main}>
      <div className={styles.containerLeft}>
        <section className={styles.section}>
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
    </main>
  );
}

export default Home;