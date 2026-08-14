// Proxies the public storefront read bundle (content/product/wilayas/fees/
// settings) from Supabase and lets Vercel's edge CDN cache the response.
// This is what actually protects Supabase egress: every visit — human or
// bot — that lands within the cache window is served straight from Vercel's
// edge and never reaches Supabase at all, regardless of how much JS a
// crawler executes.
const { sb } = require("./_supabase");

module.exports = async (req, res) => {
  try {
    const [content, products, wilayas, fees, settings] = await Promise.all([
      sb("content?select=key,value"),
      sb(
        "products?select=id,name,description,price,discount_percent,qty_tiers,bogo_buy_qty,bogo_free_qty,stock,images&active=eq.true&order=sort_order&limit=1"
      ),
      sb("wilayas?select=wilaya_id,wilaya_name_arabic,wilaya_name_latin&order=wilaya_id"),
      sb("delivery_fees?select=wilaya_id,home_fee,desk_fee,served"),
      sb("settings?select=key,value"),
    ]);

    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    res.status(200).json({
      content,
      product: products[0] || null,
      wilayas,
      fees,
      settings,
    });
  } catch (err) {
    res.setHeader("Cache-Control", "no-store");
    res.status(502).json({ error: String(err) });
  }
};
