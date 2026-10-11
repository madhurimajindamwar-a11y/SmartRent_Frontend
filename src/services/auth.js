import api from "./api";

const SESSION_KEY = "smartrent_session";

export async function login(email, password) {
const response = await api.post("/auth/login", {
    email: email.trim(),
    password,
});

const { accessToken, tokenType, expiresIn, user } = response.data;

if (!accessToken || !user || !(expiresIn > 0)) {
    throw new Error("The server returned an invalid login response.");
}

const session = {
    accessToken,
    tokenType,
    user,
    expiresAt: Date.now() + expiresIn * 1000,
};

sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

return session;
}

export function logout() {
sessionStorage.removeItem(SESSION_KEY);
}

export function getSession() {
const savedSession = sessionStorage.getItem(SESSION_KEY);

if (!savedSession) {
    return null;
}

try {
    const session = JSON.parse(savedSession);

    if (
    !session.accessToken ||
    !session.user ||
    !Number.isFinite(session.expiresAt) ||
    Date.now() >= session.expiresAt
    ) {
    logout();
    return null;
    }

    return session;
} catch {
    logout();
    return null;
}
}
export function updateSessionUser(user) {
  const session = getSession();

  if (!session || String(session.user.id) !== String(user.id)) {
    throw new Error("Your session ended. Please sign in again.");
  }

  const updatedSession = {
    ...session,
    user: {
      ...session.user,
      name: user.name,
      email: user.email,
    },
  };

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
}