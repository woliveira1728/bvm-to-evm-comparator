import { Route, Routes } from "react-router-dom";
import Home from "../../pages/Home";
import Counter from "../../pages/Counter";


const RoutesMain = () => {

    return (
        <Routes>
            
            <Route path="/" element={<Home />} />
            <Route path="/counter" element={<Counter />} />

        </Routes>
    );
};

export default RoutesMain;