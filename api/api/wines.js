import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const { rows } = await sql`
        SELECT * FROM wines ORDER BY created_at DESC
      `;
      const wines = rows.map(r => ({
        id: r.id,
        name: r.name,
        vintage: r.vintage,
        region: r.region,
        country: r.country,
        grape: r.grape,
        type: r.type,
        quantity: r.quantity,
        purchasePrice: parseFloat(r.purchase_price) || 0,
        currentValue: parseFloat(r.current_value) || 0,
        drinkFrom: r.drink_from,
        drinkBy: r.drink_by,
        peakStart: r.peak_start,
        peakEnd: r.peak_end,
        rating: r.rating,
        notes: r.notes,
        image: r.image,
        addedDate: r.added_date,
      }));
      return res.status(200).json(wines);
    }

    if (req.method === "POST") {
      const w = req.body;
      if (!w.name) return res.status(400).json({ error: "Name is required" });

      const { rows } = await sql`
        INSERT INTO wines (name, vintage, region, country, grape, type, quantity, purchase_price, current_value, drink_from, drink_by, peak_start, peak_end, rating, notes, image, added_date)
        VALUES (
          ${w.name}, ${w.vintage || null}, ${w.region || null}, ${w.country || null},
          ${w.grape || null}, ${w.type || 'Red'}, ${w.quantity || 1},
          ${w.purchasePrice || 0}, ${w.currentValue || 0},
          ${w.drinkFrom || null}, ${w.drinkBy || null}, ${w.peakStart || null}, ${w.peakEnd || null},
          ${w.rating || null}, ${w.notes || null}, ${w.image || null},
          ${w.addedDate || new Date().toISOString().split('T')[0]}
        )
        RETURNING *
      `;

      const r = rows[0];
      return res.status(201).json({
        id: r.id, name: r.name, vintage: r.vintage, region: r.region,
        country: r.country, grape: r.grape, type: r.type, quantity: r.quantity,
        purchasePrice: parseFloat(r.purchase_price) || 0,
        currentValue: parseFloat(r.current_value) || 0,
        drinkFrom: r.drink_from, drinkBy: r.drink_by,
        peakStart: r.peak_start, peakEnd: r.peak_end,
        rating: r.rating, notes: r.notes, image: r.image, addedDate: r.added_date,
      });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Wines API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
