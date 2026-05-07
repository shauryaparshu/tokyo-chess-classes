const crypto = require("crypto");

const COOKIE_NAME = "coach_dashboard_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

function getSecret() {
  return process.env.SESSION_SECRET || "change-me-in-vercel";
}

function signPayload(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
}

function encodeSession() {
  const payload = JSON.stringify({
    exp: Date.now() + SESSION_TTL_MS,
  });
  const payloadBase64 = Buffer.from(payload).toString("base64url");
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

function decodeSession(rawCookie) {
  if (!rawCookie || !rawCookie.includes(".")) {
    return null;
  }

  const [payloadBase64, signature] = rawCookie.split(".");
  if (signPayload(payloadBase64) !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function parseCookies(headerValue = "") {
  return headerValue.split(";").reduce((cookies, part) => {
    const [name, ...rest] = part.trim().split("=");
    if (!name) {
      return cookies;
    }
    cookies[name] = rest.join("=");
    return cookies;
  }, {});
}

function getSessionFromRequest(req) {
  const cookies = parseCookies(req.headers.cookie);
  return decodeSession(cookies[COOKIE_NAME]);
}

function setSessionCookie(res) {
  const token = encodeSession();
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200; Secure`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0; Secure`);
}

module.exports = {
  clearSessionCookie,
  getSessionFromRequest,
  setSessionCookie,
};
