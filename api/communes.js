// Cached proxy for per-wilaya commune lists — same rationale as bundle.js.
const { sb } = require("./_supabase");

module.exports = async (req, res) => {
  const wilayaId = req.query.wilaya_id;
  if (!wilayaId || Array.isArray(wilayaId)) {
    res.status(400).json({ error: "wilaya_id required" });
    return;
  }
  try {
    const data = await sb(
      `communes?select=commune_id,commune_name_arabic,commune_name_latin&wilaya_id=eq.${encodeURIComponent(
        wilayaId
      )}&order=commune_name_latin`
    );
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    res.status(200).json(data);
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(err) });
  }
};
