// import "@ant-design/v5-patch-for-react-19";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initHttpInterceptors } from "./api/http";
import "bootstrap/dist/css/bootstrap.min.css";
import "./global.css";
import "./styles/design-system.css";
import App from "./App.jsx";
import AppErrorBoundary from "./components/AppErrorBoundary/AppErrorBoundary";

initHttpInterceptors();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>
);
