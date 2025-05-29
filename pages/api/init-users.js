import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // ✅ CORS Headers to allow Framer access
  res.setHeader("Access-Control-Allow-Credentials", "true")
  res.setHeader("Access-Control-Allow-Origin", "https://strategic-embeds-177144.framer.app")
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  // ✅ Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end()
    return
  }

  // ✅ Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" })
  }

  // ✅ Extract user data from request body
  const { id, email, name, major, classYear, university, resume_url } = req.body

  if (!id || !email || !name) {
    return res.status(400).json({ error: "Missing required fields: id, email, or name" })
  }

  // ✅ Insert or update user data in Supabase
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

  // ✅ Success response
  return res.status(200).json({ message: "User initialized", data })
}
