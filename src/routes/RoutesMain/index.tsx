import { Route, Routes } from "react-router-dom";
import MessageStorage from "../../pages/Home";



const RoutesMain = () => {

    return (
        <Routes>
            
            <Route path="/" element={<MessageStorage />} />

        </Routes>
    );
};

export default RoutesMain;