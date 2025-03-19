import styles from "./style.module.scss";
import { Link } from "react-router-dom";

export const Header = ({  }) => {

   return (
      <header className={styles.headerContainer}>
         <h1 className={styles.headerTitle} >BVM to EVM Comparator</h1>
         <div className={styles.headerLinksContainer}>
            <Link to='/'>Message</Link>
            <Link to='/counter'>Counter</Link>
         </div>
      </header>
   );
};