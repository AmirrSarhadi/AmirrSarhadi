import { createContext, useContext } from "react";
export const ReceiptContext = createContext();
export const useReceipt = () => useContext(ReceiptContext);
