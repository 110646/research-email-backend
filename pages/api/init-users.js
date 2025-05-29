import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" })
  }

  const { id, email, name, major, classYear, university, resume_url } = req.body

  if (!id || !email || !name) {
    return res.status(400).json({ error: "Missing required fields: id, email, or name" })
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(
      [
        {
          id,
          email,
          name,
          major,
          class_year: classYear, 
          university,
          resume_url,
        },
      ],
      { onConflict: "id" }
    )

  if (error) {
    return res.status(500).json({ error: "Database error", details: error })
  }

  return res.status(200).json({ message: "User initialized", data })
}
