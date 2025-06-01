import styles from './styles.module.scss';
import { useUser } from '../../providers/UserContext';

const TransactionTimer = () => {
    const { transactionTime, isTimerRunning } = useUser();
    
    return (
        <div className={styles.timerContainer}>
            <h3>Tempo de Transação: {transactionTime}</h3>
            <div className={styles.timerStatus}>
                Status: {isTimerRunning ? 'Em andamento' : 'Concluído'}
            </div>
        </div>
    );
};

export default TransactionTimer;