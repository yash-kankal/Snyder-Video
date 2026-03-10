export function getAuth() {
  if (typeof window === "undefined") return { token: "", user: null };
  let token = "";
  let rawUser = null;
  try {
    token = localStorage.getItem("snyder_token") || "";
    rawUser = localStorage.getItem("snyder_user");
  } catch {
    return { token: "", user: null };
  }
  let user = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser);
    } catch {
      user = null;
      try {
        localStorage.removeItem("snyder_user");
      } catch {}
    }
  }
  return { token, user };
}

export function setAuth(token, user) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("snyder_token", token);
    localStorage.setItem("snyder_user", JSON.stringify(user));
  } catch {}
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("snyder_token");
    localStorage.removeItem("snyder_user");
  } catch {}
}
