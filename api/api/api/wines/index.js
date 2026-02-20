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
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    if (req.method === "GET") {
      const result = await query("SELECT * FROM wines ORDER BY created_at DESC");
      const wines = (result.rows || []).map(row => toWine(result.fields, row));
      return res.status(200).json(wines);
    }

    if (req.method === "POST") {
      const w = req.body;
      if (!w.name) return res.status(400).json({ error: "Name is required" });
      const result = await query(
        `INSERT INTO wines (name, vintage, region, country, grape, type, quantity, purchase_price, current_value, drink_from, drink_by, peak_start, peak_end, rating, notes, image, added_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
        [w.name, w.vintage||null, w.region||null, w.country||null, w.grape||null,
         w.type||'Red', w.quantity||1, w.purchasePrice||0, w.currentValue||0,
         w.drinkFrom||null, w.drinkBy||null, w.peakStart||null, w.peakEnd||null,
         w.rating||null, w.notes||null, w.image||null,
         w.addedDate || new Date().toISOString().split('T')[0]]
      );
      return res.status(201).json(toWine(result.fields, result.rows[0]));
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
