const { ensureSchema, getSql } = require("./_lib/db");
const { getSessionFromRequest } = require("./_lib/session");

const DASHBOARD_STATE_ID = "single-user-dashboard";

function getPayload(body) {
  if (body && typeof body === "object" && !Array.isArray(body) && body.data) {
    return body.data;
  }

  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (!getSessionFromRequest(req)) {
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }

  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === "GET") {
      const rows = await sql`
        select payload, updated_at
        from dashboard_state
        where id = ${DASHBOARD_STATE_ID}
        limit 1
      `;

      return res.status(200).json({
        ok: true,
        data: rows[0]?.payload || null,
        updatedAt: rows[0]?.updated_at || null,
      });
    }

    if (req.method === "POST") {
      const payload = getPayload(req.body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return res.status(400).json({ ok: false, error: "Missing dashboard data payload" });
      }

      await sql`
        insert into dashboard_state (id, payload)
        values (${DASHBOARD_STATE_ID}, ${sql.json(payload)})
        on conflict (id)
        do update set
          payload = excluded.payload,
          updated_at = now()
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message || "Database request failed",
    });
  }
};
