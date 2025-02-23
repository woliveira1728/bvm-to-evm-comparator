import { Route, Routes } from "react-router-dom";
import Home from "../../pages/home";
import MessageStorage from "../../pages/MessageStorage";



const RoutesMain = () => {

    return (
        <Routes>
            
            <Route path="/" element={<Home />} />
            <Route path="/message" element={<MessageStorage />} />

        </Routes>
    );
};

export default RoutesMain;