import axios from "axios";
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = "http://localhost:5000";

// Call your backend to generate SQL using GPT
const generate = async (queryDescription) => {
  if (!queryDescription || typeof queryDescription !== "string") {
    throw new Error("Invalid or missing query description");
  }

  try {
    const response = await axios.post(`${BASE_URL}/generate-sql`, {
      prompt: queryDescription,
    });

    return response.data.sql;
  } catch (err) {
    console.error("SQL generation failed:", err);
    throw err.response?.data?.error || "SQL generation error";
  }
};

export default generate;
