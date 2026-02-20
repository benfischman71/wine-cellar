import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "ID required" });

  try {
    if (req.method === "PUT") {
      const w = req.body;
      const { rows } = await sql`
        UPDATE wines SET
          name = COALESCE(${w.name || null}, name),
          vintage = COALESCE(${w.vintage || null}, vintage),
          region = COALESCE(${w.region || null}, region),
          country = COALESCE(${w.country || null}, country),
          grape = COALESCE(${w.grape || null}, grape),
          type = COALESCE(${w.type || null}, type),
          quantity = COALESCE(${w.quantity != null ? w.quantity : null}, quantity),
          purchase_price = COALESCE(${w.purchasePrice || null}, purchase_price),
          current_value = COALESCE(${w.currentValue || null}, current_value),
          drink_from = COALESCE(${w.drinkFrom || null}, drink_from),
          drink_by = COALESCE(${w.drinkBy || null}, drink_by),
          peak_start = COALESCE(${w.peakStart || null}, peak_start),
          peak_end = COALESCE(${w.peakEnd || null}, peak_end),
          rating = COALESCE(${w.rating || null}, rating),
          notes = COALESCE(${w.notes || null}, notes)
        WHERE id = ${id}
        RETURNING *
      `;

      if (rows.length === 0) return res.status(404).json({ error: "Wine not found" });

      const r = rows[0];
      return res.status(200).json({
        id: r.id, name: r.name, vintage: r.vintage, region: r.region,
        country: r.country, grape: r.grape, type: r.type, quantity: r.quantity,
        purchasePrice: parseFloat(r.purchase_price) || 0,
        currentValue: parseFloat(r.current_value) || 0,
        drinkFrom: r.drink_from, drinkBy: r.drink_by,
        peakStart: r.peak_start, peakEnd: r.peak_end,
        rating: r.rating, notes: r.notes, image: r.image, addedDate: r.added_date,
      });
    }

    if (req.method === "DELETE") {
      const { rowCount } = await sql`DELETE FROM wines WHERE id = ${id}`;
      if (rowCount === 0) return res.status(404).json({ error: "Wine not found" });
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Wine API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
