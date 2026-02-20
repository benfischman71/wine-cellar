import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS wines (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        vintage INTEGER,
        region TEXT,
        country TEXT,
        grape TEXT,
        type TEXT,
        quantity INTEGER DEFAULT 1,
        purchase_price NUMERIC(10,2) DEFAULT 0,
        current_value NUMERIC(10,2) DEFAULT 0,
        drink_from INTEGER,
        drink_by INTEGER,
        peak_start INTEGER,
        peak_end INTEGER,
        rating INTEGER,
        notes TEXT,
        image TEXT,
        added_date TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    return res.status(200).json({ message: "Table created successfully" });
  } catch (error) {
    console.error("Setup error:", error);
    return res.status(500).json({ error: error.message });
  }
}
