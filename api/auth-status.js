const { getSessionFromRequest } = require("./_lib/session");

module.exports = (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ authenticated: false, error: "Method not allowed" });
  }

  const session = getSessionFromRequest(req);
  return res.status(200).json({ authenticated: Boolean(session) });
};
