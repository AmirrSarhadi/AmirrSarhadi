import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app/App";
import "./styles/index.css";
import "./styles/app-navigation.css";
import "./shared/ui/ui.css";
import "./inventory/inventory.css";
import "./styles/settlement.css";
import "./styles/table-status.css";
import "./styles/table-editor.css";
import "./styles/customer-picker.css";
import "./styles/customer-directory.css";
import "./styles/receipt-archive.css";
import "./styles/menu-editor.css";
import "./styles/category-manager.css";
import "./styles/range-report.css";
import "./styles/cash-shift.css";
import "./styles/refinement.css";
import "./styles/order-entry.css";
import "./styles/help-guide.css";
import "./styles/responsive.css";
import "./styles/desktop.css";
import "./styles/open-order-cards.css";
import "./styles/item-availability.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
