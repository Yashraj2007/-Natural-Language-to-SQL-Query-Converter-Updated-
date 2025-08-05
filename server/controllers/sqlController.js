import generate from "../generate.js";
import { executeSQL } from "../utils/executeSQL.js";

export const generateSQL = async (req, res) => {
  const { prompt, method } = req.body;

  try {
    const sql = await generate(prompt, method);

    // Define your MySQL connection details (make sure these match your Workbench setup)
  

    // Actually execute the SQL on the MySQL database
    const result = await executeSQL({
      dialect: "mysql",
      connection,
      query: sql,
    });

    res.json({ sql, result }); // send both the SQL and execution result
  } catch (error) {
    console.error("Error generating/executing SQL:", error.message);
    res.status(500).json({ error: "Failed to generate or execute SQL" });
  }
};

