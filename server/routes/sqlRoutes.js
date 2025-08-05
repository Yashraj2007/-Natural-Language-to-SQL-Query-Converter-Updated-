import express from "express";
import { generateSQL } from "../controllers/sqlController.js";

const router = express.Router();

// POST /generate-sql
router.post("/generate-sql", generateSQL);

export default router;
