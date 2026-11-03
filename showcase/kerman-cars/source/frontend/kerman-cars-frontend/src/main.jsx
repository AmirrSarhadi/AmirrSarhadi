import queryClient from "./services/queryClient";
import useAuthStore from "./store/authStore";
import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import App from "./App";

import "@fontsource/vazirmatn/400.css";
import "@fontsource/vazirmatn/500.css";
import "@fontsource/vazirmatn/600.css";
import "@fontsource/vazirmatn/700.css";
import "@fontsource/vazirmatn/800.css";
import "@fontsource/estedad/700.css";
import "@fontsource/estedad/800.css";

import "bootstrap/dist/css/bootstrap.rtl.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./assets/styles/main.scss";

// Never restore a simulated login from the previous frontend.
localStorage.removeItem("kc-auth-storage");
useAuthStore.subscribe((state, previous) => {
    if (
        state.user?.id !== previous.user?.id ||
        state.isAuthenticated !== previous.isAuthenticated
    ) {
        queryClient.clear();
    }
});

const rootElement = document.getElementById("root");

if (!rootElement) {
    throw new Error('عنصر با شناسه "root" پیدا نشد.');
}

const router = createBrowserRouter([{ path: "*", element: <App /> }]);

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />

            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3500,
                    style: { background: "var(--kc-card-bg)", color: "var(--kc-text)", border: "1px solid var(--kc-border)", borderRadius: "var(--kc-radius-sm)", fontFamily: "var(--kc-font-body)" },
                }}
            />
        </QueryClientProvider>
    </React.StrictMode>,
);
