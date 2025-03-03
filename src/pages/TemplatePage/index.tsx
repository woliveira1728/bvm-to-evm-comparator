import { Header } from "../../components/Header";
import styles from "./style.module.scss";

import { ReactNode } from "react";

const TemplatePage = ({ children }: { children: ReactNode }) => {    

    return (
        <>
            <Header />
            <main className={styles.mainContainer}>{children}</main>
        </>
    )
}

export default TemplatePage;