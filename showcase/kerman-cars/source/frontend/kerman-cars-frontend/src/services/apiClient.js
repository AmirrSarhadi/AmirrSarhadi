import useAuthStore from "../store/authStore.js";
import { createApiClient } from "./httpClient.js";

export default createApiClient({
    baseURL: import.meta.env.VITE_API_BASE_URL || "/api/",
    session: useAuthStore,
});
