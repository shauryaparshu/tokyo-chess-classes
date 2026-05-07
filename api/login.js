const crypto = require("crypto");
const { setSessionCookie } = require("./_lib/session");

function safeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  if (left.length !== right.length) {
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const expectedPassword = process.env.DASHBOARD_PASSWORD;
  if (!expectedPassword) {
    return res.status(500).json({
      ok: false,
      error: "Missing DASHBOARD_PASSWORD environment variable",
    });
  }

  const suppliedPassword = req.body?.password || "";
  if (!safeEqual(suppliedPassword, expectedPassword)) {
    return res.status(401).json({ ok: false, error: "Invalid password" });
  }

  setSessionCookie(res);
  return res.status(200).json({ ok: true });
};
