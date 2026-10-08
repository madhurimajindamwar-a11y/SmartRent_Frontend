import axios from "axios";

const api = axios.create({
baseURL: "/api",
timeout: 15000,
});

api.interceptors.request.use((config) => {
  // Login and registration do not need an existing token.
if (
    config.url === "/auth/login" ||
    config.url === "/auth/register"
) {
    return config;
}

const savedSession = sessionStorage.getItem("smartrent_session");

if (!savedSession) {
    return config;
}

try {
    const session = JSON.parse(savedSession);

    if (
    session.accessToken &&
    Number.isFinite(session.expiresAt) &&
    Date.now() < session.expiresAt
    ) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
    } else {
    sessionStorage.removeItem("smartrent_session");
    }
} catch {
    sessionStorage.removeItem("smartrent_session");
}

return config;
});

export default api;