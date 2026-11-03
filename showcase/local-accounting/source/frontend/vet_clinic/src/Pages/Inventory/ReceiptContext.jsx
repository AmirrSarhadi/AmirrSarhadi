import { useState } from "react";

import { ReceiptContext } from "./receiptContextStore";

export const ReceiptProvider = ({ children }) => {
    const [step1Data, setStep1Data] = useState(null);

    return (
        <ReceiptContext.Provider value={{ step1Data, setStep1Data }}>
            {children}
        </ReceiptContext.Provider>
    );
};
