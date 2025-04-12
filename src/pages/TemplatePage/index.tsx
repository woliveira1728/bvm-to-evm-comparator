import { Header } from "../../components/Header";
import Wallets from "../../components/Wallets";
import styles from "./style.module.scss";

import { ReactNode } from "react";

const TemplatePage = ({ children }: { children: ReactNode }) => {    

    return (
        <>
            <Header />
            <Wallets />
            <main className={styles.mainContainer}>{children}</main>
        </>
    )
}

export default TemplatePage;