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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
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
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
