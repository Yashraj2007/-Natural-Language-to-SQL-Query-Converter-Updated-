import mysql from "mysql2/promise";

/**
 * Executes SQL queries against a MySQL database
 * @param {Object} params - Parameters object
 * @param {string} params.dialect - Database dialect (must be 'mysql')
 * @param {Object} params.connection - Database connection configuration
 * @param {string} params.connection.host - Database host
 * @param {string} params.connection.user - Database username
 * @param {string} params.connection.password - Database password
 * @param {string} params.connection.database - Database name
 * @param {number} [params.connection.port=3306] - Database port
 * @param {string} params.query - SQL query to execute
 * @returns {Promise<Array>} Query results
 * @throws {Error} If dialect is not MySQL or query execution fails
 */
export const executeSQL = async ({ dialect, connection, query }) => {
  // Input validation
  if (!dialect || dialect !== "mysql") {
    throw new Error("Only MySQL dialect is supported");
  }

  if (!connection) {
    throw new Error("Database connection configuration is required");
  }

  if (!query || typeof query !== "string" || query.trim() === "") {
    throw new Error("Valid SQL query is required");
  }

  const { host, user, password, database, port } = connection;

  // Validate required connection parameters
  const requiredFields = { host, user, database };
  const missingFields = Object.entries(requiredFields)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  if (missingFields.length > 0) {
    throw new Error(`Missing required connection parameters: ${missingFields.join(", ")}`);
  }

  let db = null;
  const startTime = Date.now();

  try {
    // Create database connection with enhanced configuration
    db = await mysql.createConnection({
      host,
      user,
      password,
      database,
      port: port || 3306,
      multipleStatements: true,
      connectTimeout: 30000, // 30 seconds
      acquireTimeout: 30000,
      timeout: 30000,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
    });

    console.log(`✅ Connected to MySQL database: ${database}@${host}:${port || 3306}`);

    // Execute the query
    const [rows, fields] = await db.execute(query);
    const executionTime = Date.now() - startTime;

    console.log(`🚀 Query executed successfully in ${executionTime}ms`);
    console.log(`📊 Returned ${Array.isArray(rows) ? rows.length : 'N/A'} rows`);

    return {
      data: rows,
      fields: fields,
      rowCount: Array.isArray(rows) ? rows.length : null,
      executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    // Enhanced error logging
    console.error("❌ MySQL operation failed:");
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   SQL State: ${error.sqlState || 'N/A'}`);
    console.error(`   Execution time: ${executionTime}ms`);
    
    // Create a more informative error
    const enhancedError = new Error(`MySQL execution failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.executionTime = executionTime;
    enhancedError.query = query;
    
    throw enhancedError;

  } finally {
    // Ensure connection cleanup
    if (db) {
      try {
        await db.end();
        console.log("🔐 MySQL connection closed successfully");
      } catch (closeError) {
        console.error("⚠️ Error closing MySQL connection:", closeError.message);
      }
    }
  }
};

/**
 * Creates a connection pool for better performance with multiple queries
 * @param {Object} connection - Database connection configuration
 * @returns {mysql.Pool} MySQL connection pool
 */
export const createPool = (connection) => {
  const { host, user, password, database, port } = connection;
  
  return mysql.createPool({
    host,
    user,
    password,
    database,
    port: port || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });
};

/**
 * Executes SQL queries using a connection pool (recommended for multiple queries)
 * @param {mysql.Pool} pool - MySQL connection pool
 * @param {string} query - SQL query to execute
 * @returns {Promise<Object>} Query results with metadata
 */
export const executeWithPool = async (pool, query) => {
  if (!query || typeof query !== "string" || query.trim() === "") {
    throw new Error("Valid SQL query is required");
  }

  const startTime = Date.now();

  try {
    const [rows, fields] = await pool.execute(query);
    const executionTime = Date.now() - startTime;

    console.log(`🚀 Pool query executed in ${executionTime}ms`);
    
    return {
      data: rows,
      fields: fields,
      rowCount: Array.isArray(rows) ? rows.length : null,
      executionTime,
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error("❌ Pool query failed:", error.message);
    
    const enhancedError = new Error(`MySQL pool execution failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.executionTime = executionTime;
    enhancedError.query = query;
    
    throw enhancedError;
  }
};