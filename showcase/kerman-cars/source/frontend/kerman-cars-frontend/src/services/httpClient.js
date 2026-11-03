import axios from "axios";

function errorMessage(data) {
    if (typeof data === "string") return data;
    if (Array.isArray(data)) return data.map(errorMessage).filter(Boolean).join(" ");
    if (data && typeof data === "object") {
        if (data.detail) return errorMessage(data.detail);
        return Object.values(data).map(errorMessage).filter(Boolean).join(" ");
    }
    return "";
}

export function createApiClient({ baseURL, session }) {
    const options = { baseURL, timeout: 20000 };
    const client = axios.create(options);
    const refreshClient = axios.create(options);
    let refreshRequest = null;

    client.interceptors.request.use((config) => {
        if (!config.skipAuth) {
            const token = session.getState().accessToken;
            if (token) config.headers.Authorization = `Bearer ${token}`;
            config.sessionToken = token;
            config.sessionVersion ??= session.getState().sessionVersion;
        }
        return config;
    });
    client.interceptors.response.use((response) => response, async (error) => {
        const config = error.config;
        const state = session.getState();
        if (error.response?.status === 401 && config && !config.skipAuth && !config.retried && state.refreshToken) {
            config.retried = true;
            try {
                if (config.sessionVersion !== state.sessionVersion) throw new Error("نشست تغییر کرده است؛ دوباره تلاش کنید.");
                // Delayed 401s may belong to an access token already refreshed.
                if (config.sessionToken === state.accessToken) {
                    if (!refreshRequest) {
                        const previousRefresh = state.refreshToken;
                        refreshRequest = refreshClient.post("accounts/refresh/", { refresh: previousRefresh })
                            .then(({ data }) => {
                                if (session.getState().refreshToken !== previousRefresh) {
                                    throw new Error("نشست تغییر کرده است؛ دوباره وارد شوید.");
                                }
                                session.getState().setTokens(data.access, data.refresh ?? previousRefresh);
                            })
                            .catch((refreshError) => {
                                if ([400, 401, 403].includes(refreshError.response?.status) && session.getState().refreshToken === previousRefresh) {
                                    session.getState().clearSession();
                                }
                                throw refreshError;
                            })
                            .finally(() => { refreshRequest = null; });
                    }
                    await refreshRequest;
                }
                if (config.sessionVersion !== session.getState().sessionVersion) throw new Error("نشست تغییر کرده است؛ دوباره تلاش کنید.");
                if (!session.getState().accessToken) throw error;
                return await client(config);
            } catch (refreshError) {
                refreshError.message = errorMessage(refreshError.response?.data) || "تمدید نشست انجام نشد؛ دوباره تلاش کنید.";
                throw refreshError;
            }
        }
        if (error.response?.status === 401 && !config?.skipAuth &&
            (!state.refreshToken || (config.retried && config.sessionVersion === state.sessionVersion))) state.clearSession();
        error.message = errorMessage(error.response?.data) || (error.response ? "انجام درخواست ممکن نشد." : "ارتباط با سرور برقرار نشد؛ دوباره تلاش کنید.");
        throw error;
    });
    return client;
}
