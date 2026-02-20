async function query(sql, params = []) {
  const cs = process.env.POSTGRES_URL;
  if (!cs) throw new Error("POSTGRES_URL not set");
  const host = cs.match(/@([^/]+)\//)?.[1];
  const res = await fetch("https://" + host + "/sql", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Neon-Connection-String": cs },
    body: JSON.stringify({ query: sql, params }),
  });
  if (!res.ok) throw new Error(await res.text());
  return await res.json();
}

function toWine(fields, row) {
  const r = {};
  fields.forEach((f, i) => r[f.name] = row[i]);
  return {
    id: r.id, name: r.name, vintage: r.vintage, region: r.region,
    country: r.country, grape: r.grape, type: r.type, quantity: r.quantity,
    purchasePrice: parseFloat(r.purchase_price) || 0,
    currentValue: parseFloat(r.current_value) || 0,
    drinkFrom: r.drink_from, drinkBy: r.drink_by,
    peakStart: r.peak_start, peakEnd: r.peak_end,
    rating: r.rating, notes: r.notes, image: r.image, addedDate: r.added_date,
  };
}

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
      const result = await query(
        `UPDATE wines SET
          name = COALESCE($1, name), vintage = COALESCE($2, vintage),
          region = COALESCE($3, region), country = COALESCE($4, country),
          grape = COALESCE($5, grape), type = COALESCE($6, type),
          quantity = COALESCE($7, quantity), purchase_price = COALESCE($8, purchase_price),
          current_value = COALESCE($9, current_value), drink_from = COALESCE($10, drink_from),
          drink_by = COALESCE($11, drink_by), peak_start = COALESCE($12, peak_start),
          peak_end = COALESCE($13, peak_end), rating = COALESCE($14, rating),
          notes = COALESCE($15, notes)
        WHERE id = $16 RETURNING *`,
        [w.name||null, w.vintage||null, w.region||null, w.country||null,
         w.grape||null, w.type||null, w.quantity!=null?w.quantity:null,
         w.purchasePrice||null, w.currentValue||null, w.drinkFrom||null,
         w.drinkBy||null, w.peakStart||null, w.peakEnd||null,
         w.rating||null, w.notes||null, id]
      );
      if (!result.rows?.length) return res.status(404).json({ error: "Wine not found" });
      return res.status(200).json(toWine(result.fields, result.rows[0]));
    }

    if (req.method === "DELETE") {
      const result = await query("DELETE FROM wines WHERE id = $1", [id]);
      if (result.rowCount === 0) return res.status(404).json({ error: "Wine not found" });
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
