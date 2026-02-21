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
  const data = await res.json();
  // Neon returns rows as arrays + fields as metadata
  // Convert to objects
  const fields = (data.fields || []).map(f => f.name);
  const rows = (data.rows || []).map(row => {
    if (Array.isArray(row)) {
      const obj = {};
      fields.forEach((name, i) => obj[name] = row[i]);
      return obj;
    }
    return row; // already an object
  });
  return { rows, rowCount: data.rowCount || rows.length };
}

function toWine(r) {
  return {
    id: r.id,
    name: r.name || "",
    vintage: r.vintage ? Number(r.vintage) : null,
    region: r.region || "",
    country: r.country || "",
    grape: r.grape || "",
    type: r.type || "Red",
    quantity: r.quantity != null ? Number(r.quantity) : 1,
    purchasePrice: parseFloat(r.purchase_price) || 0,
    currentValue: parseFloat(r.current_value) || 0,
    drinkFrom: r.drink_from ? Number(r.drink_from) : null,
    drinkBy: r.drink_by ? Number(r.drink_by) : null,
    peakStart: r.peak_start ? Number(r.peak_start) : null,
    peakEnd: r.peak_end ? Number(r.peak_end) : null,
    rating: r.rating ? Number(r.rating) : null,
    notes: r.notes || "",
    image: r.image || null,
    addedDate: r.added_date || "",
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const { action } = req.body;

  try {
    if (action === "setup") {
      await query(`CREATE TABLE IF NOT EXISTS wines (
        id SERIAL PRIMARY KEY, name TEXT NOT NULL, vintage INTEGER,
        region TEXT, country TEXT, grape TEXT, type TEXT,
        quantity INTEGER DEFAULT 1, purchase_price NUMERIC(10,2) DEFAULT 0,
        current_value NUMERIC(10,2) DEFAULT 0, drink_from INTEGER,
        drink_by INTEGER, peak_start INTEGER, peak_end INTEGER,
        rating INTEGER, notes TEXT, image TEXT, added_date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`);
      return res.status(200).json({ message: "Table created successfully" });
    }

    if (action === "debug") {
      const result = await query("SELECT * FROM wines LIMIT 1");
      return res.status(200).json(result);
    }

    if (action === "list") {
      const result = await query("SELECT * FROM wines ORDER BY created_at DESC");
      const wines = result.rows.map(toWine);
      return res.status(200).json(wines);
    }

    if (action === "add") {
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
      return res.status(201).json(toWine(result.rows[0]));
    }

    if (action === "update") {
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
         w.rating||null, w.notes||null, w.id]
      );
      if (!result.rows.length) return res.status(404).json({ error: "Wine not found" });
      return res.status(200).json(toWine(result.rows[0]));
    }

    if (action === "delete") {
      await query("DELETE FROM wines WHERE id = $1", [req.body.id]);
      return res.status(200).json({ message: "Deleted" });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
