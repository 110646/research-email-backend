import formidable from "formidable";
import fs from "fs/promises";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST allowed" });
  }

  const form = formidable({ keepExtensions: true });

  try {
    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const {
      user_id,
      email,
      name,
      major,
      class_year,
      university,
    } = fields;

    const resume = files.resume;
    if (!resume) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const fileBuffer = await fs.readFile(resume.filepath);
    const base64 = fileBuffer.toString("base64");

    const resume_url = `https://your-app.com/resumes/${resume.originalFilename}`;

    
    const { error: upsertError } = await supabase
      .from("users")
      .upsert({
        id: user_id,
        email,
        name,
        major,
        class_year,
        university,
        resume_url,
      });

    if (upsertError) {
      console.error("Supabase upsert error:", upsertError);
      return res.status(500).json({ error: "Supabase upsert failed" });
    }

    
    const prompt = `
You are an AI assistant helping a student email professors.

Step 1: Extract structured data from the student's resume (base64 PDF below). Focus on:
- skills
- research interests
- career goals
- academic background

Step 2: Use that info along with their profile to write a personalized cold email template asking a professor about research opportunities.

Leave placeholders for:
- {{ProfessorName}}
- {{University}}
- {{Major}}

User Info:
- Name: ${name}
- Major: ${major}
- Class Year: ${class_year}
- University: ${university}

Resume base64 (truncated):
${base64.slice(0, 10000)}

Return your response in this exact JSON format:
{
  "parsedInfo": {
    "skills": [],
    "goals": "",
    "interests": "",
    "education": ""
  },
  "emailTemplate": "Dear {{ProfessorName}}, ..."
}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    let result;
    try {
      result = JSON.parse(reply);
    } catch {
      return res.status(500).json({ error: "OpenAI returned invalid JSON", raw: reply });
    }

    return res.status(200).json({
      parsedInfo: result.parsedInfo,
      emailTemplate: result.emailTemplate,
    });

  } catch (err) {
    console.error("Internal error:", err);
    return res.status(500).json({ error: "Server error occurred" });
  }
}
