import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mysql from 'mysql2/promise';
import pkg from 'pg';
import { Configuration, OpenAIApi } from 'openai';

const { Client } = pkg;

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",          // for local development
  "https://nl-to-sql-ruby.vercel.app" // new frontend URL
];
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS policy: Not allowed"));
    }
  },
  methods: ["GET", "POST"],
  credentials: true
}));

// Validate OpenAI key
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ OPENAI_API_KEY is missing in .env file');
  process.exit(1);
}

// Configure OpenAI with OpenRouter if available
const configuration = new Configuration({
  apiKey,
  basePath: process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1/chat/completions', // default to OpenAI if no override
});
const openai = new OpenAIApi(configuration);

// Root health check
app.get("/", (req, res) => {
  res.send("✅ SQL Generator API is running.");
});

// SQL Generation route
app.post('/generate-sql', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing prompt.' });
  }

  try {
    const response = await openai.createChatCompletion({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [
        {
          role: "system",
          content: "You are a professional SQL assistant. Only respond with valid SQL first, then a brief plain English explanation. Do not use markdown formatting or ```."
        },
        {
          role: "user",
          content: `Convert this to SQL: ${prompt}`
        }
      ],
      temperature: 0.2,
    });

    const sql = response?.data?.choices?.[0]?.message?.content?.trim();

    if (!sql) {
      return res.status(500).json({ error: 'No SQL was generated.' });
    }

   console.log("🧠 Prompt:", prompt);
console.log("📤 SQL Response:", sql);

    res.json({ sql });

  } catch (err) {
    console.error("❌ OpenAI error:", err?.response?.data || err.message || err);
    res.status(500).json({ error: 'Failed to generate SQL from prompt.' });
  }
});

// SQL Execution route
app.post('/execute-sql', async (req, res) => {
  const { sql, dialect } = req.body;

  if (!sql || !dialect) {
    return res.status(400).json({ error: 'SQL and dialect are required.' });
  }

  try {
    let result;

    if (dialect === 'mysql') {
      const conn = await mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DB,
      });

      const [rows] = await conn.execute(sql);
      await conn.end();
      result = rows;

    } else if (dialect === 'postgres') {
      const client = new Client({
        host: process.env.PG_HOST,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
        database: process.env.PG_DB,
      });

      await client.connect();
      const resData = await client.query(sql);
      await client.end();
      result = resData.rows;

    } else {
      return res.status(400).json({ error: 'Unsupported SQL dialect.' });
    }

    res.json({ result });

  } catch (err) {
    console.error('❌ SQL Execution Error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});



