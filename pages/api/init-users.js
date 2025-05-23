import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const { id, email } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "Missing user id or email" });
  }

  const { error } = await supabase
    .from("users")
    .insert({ id, email })
    .onConflict("id")
    .ignore();

  if (error) {
    return res.status(500).json({ error: "Database error", details: error });
  }

  return res.status(200).json({ message: "User initialized" });
}
