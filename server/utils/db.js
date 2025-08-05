import mysql from 'mysql2/promise';
import pkg from 'pg';
const { Client, Pool } = pkg;

/**
 * Supported database dialects
 */
const SUPPORTED_DIALECTS = ['mysql', 'postgres', 'postgresql'];

/**
 * Database connection configuration validator
 * @param {Object} connection - Database connection config
 * @param {string} dialect - Database dialect
 * @throws {Error} If configuration is invalid
 */
function validateConnection(connection, dialect) {
  const requiredFields = ['host', 'user', 'database'];
  const missingFields = requiredFields.filter(field => !connection[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required connection fields: ${missingFields.join(', ')}`);
  }

  // Password is optional for some auth methods but we'll warn if missing
  if (!connection.password) {
    console.warn('⚠️ No password provided - ensure your database supports passwordless authentication');
  }
}

/**
 * Executes SQL queries against MySQL or PostgreSQL databases
 * @param {Object} params - Parameters object
 * @param {string} params.dialect - Database dialect ('mysql', 'postgres', or 'postgresql')
 * @param {Object} params.connection - Database connection configuration
 * @param {string} params.connection.host - Database host
 * @param {string} params.connection.user - Database username
 * @param {string} params.connection.password - Database password (optional for some auth methods)
 * @param {string} params.connection.database - Database name
 * @param {number} [params.connection.port] - Database port (defaults: MySQL=3306, PostgreSQL=5432)
 * @param {string|Array} params.query - SQL query to execute (string) or parameterized query [query, params]
 * @param {Object} [params.options] - Additional options
 * @param {number} [params.options.timeout=30000] - Query timeout in milliseconds
 * @param {boolean} [params.options.ssl=false] - Enable SSL connection
 * @returns {Promise<Object>} Query results with metadata
 * @throws {Error} If parameters are invalid or query execution fails
 */
export async function executeSQL({ dialect, connection, query, options = {} }) {
  const startTime = Date.now();

  // Input validation
  if (!dialect || typeof dialect !== 'string') {
    throw new Error('Dialect is required and must be a string');
  }

  const normalizedDialect = dialect.toLowerCase();
  if (!SUPPORTED_DIALECTS.includes(normalizedDialect)) {
    throw new Error(`Unsupported dialect: ${dialect}. Supported: ${SUPPORTED_DIALECTS.join(', ')}`);
  }

  if (!connection || typeof connection !== 'object') {
    throw new Error('Connection configuration is required and must be an object');
  }

  if (!query || (typeof query !== 'string' && !Array.isArray(query))) {
    throw new Error('Query is required and must be a string or array [query, params]');
  }

  // Validate connection configuration
  validateConnection(connection, normalizedDialect);

  const { timeout = 30000, ssl = false } = options;

  try {
    if (normalizedDialect === 'mysql') {
      return await executeMySQLQuery({ connection, query, timeout, ssl, startTime });
    }

    if (normalizedDialect === 'postgres' || normalizedDialect === 'postgresql') {
      return await executePostgreSQLQuery({ connection, query, timeout, ssl, startTime });
    }

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ ${dialect.toUpperCase()} query execution failed:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Execution time: ${executionTime}ms`);
    
    const enhancedError = new Error(`${dialect} execution failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.executionTime = executionTime;
    enhancedError.dialect = dialect;
    
    throw enhancedError;
  }
}

/**
 * Executes MySQL query with enhanced error handling and logging
 */
async function executeMySQLQuery({ connection, query, timeout, ssl, startTime }) {
  let conn = null;

  try {
    conn = await mysql.createConnection({
      host: connection.host,
      user: connection.user,
      password: connection.password,
      database: connection.database,
      port: connection.port || 3306,
      connectTimeout: timeout,
      acquireTimeout: timeout,
      timeout: timeout,
      ssl: ssl ? { rejectUnauthorized: false } : false,
      multipleStatements: false, // Security: prevent multiple statements by default
    });

    console.log(`✅ Connected to MySQL: ${connection.database}@${connection.host}:${connection.port || 3306}`);

    let rows, fields;
    if (Array.isArray(query)) {
      [rows, fields] = await conn.execute(query[0], query[1]);
    } else {
      [rows, fields] = await conn.execute(query);
    }

    const executionTime = Date.now() - startTime;
    console.log(`🚀 MySQL query executed in ${executionTime}ms`);
    console.log(`📊 Returned ${Array.isArray(rows) ? rows.length : 'N/A'} rows`);

    return {
      data: rows,
      fields: fields,
      rowCount: Array.isArray(rows) ? rows.length : null,
      executionTime,
      dialect: 'mysql'
    };

  } finally {
    if (conn) {
      try {
        await conn.end();
        console.log('🔐 MySQL connection closed');
      } catch (closeError) {
        console.error('⚠️ Error closing MySQL connection:', closeError.message);
      }
    }
  }
}

/**
 * Executes PostgreSQL query with enhanced error handling and logging
 */
async function executePostgreSQLQuery({ connection, query, timeout, ssl, startTime }) {
  const client = new Client({
    host: connection.host,
    user: connection.user,
    password: connection.password,
    database: connection.database,
    port: connection.port || 5432,
    connectionTimeoutMillis: timeout,
    query_timeout: timeout,
    ssl: ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log(`✅ Connected to PostgreSQL: ${connection.database}@${connection.host}:${connection.port || 5432}`);

    let res;
    if (Array.isArray(query)) {
      res = await client.query(query[0], query[1]);
    } else {
      res = await client.query(query);
    }

    const executionTime = Date.now() - startTime;
    console.log(`🚀 PostgreSQL query executed in ${executionTime}ms`);
    console.log(`📊 Returned ${res.rows.length} rows`);

    return {
      data: res.rows,
      fields: res.fields,
      rowCount: res.rowCount,
      executionTime,
      dialect: 'postgresql'
    };

  } finally {
    try {
      await client.end();
      console.log('🔐 PostgreSQL connection closed');
    } catch (closeError) {
      console.error('⚠️ Error closing PostgreSQL connection:', closeError.message);
    }
  }
}

/**
 * Creates database connection pools for better performance
 * @param {string} dialect - Database dialect
 * @param {Object} connection - Connection configuration
 * @param {Object} poolOptions - Pool-specific options
 * @returns {Object} Database connection pool
 */
export function createConnectionPool(dialect, connection, poolOptions = {}) {
  validateConnection(connection, dialect);
  
  const normalizedDialect = dialect.toLowerCase();

  if (normalizedDialect === 'mysql') {
    return mysql.createPool({
      host: connection.host,
      user: connection.user,
      password: connection.password,
      database: connection.database,
      port: connection.port || 3306,
      waitForConnections: true,
      connectionLimit: poolOptions.max || 10,
      queueLimit: 0,
      acquireTimeout: poolOptions.acquireTimeout || 30000,
      timeout: poolOptions.timeout || 30000,
      reconnect: true,
      ssl: poolOptions.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  if (normalizedDialect === 'postgres' || normalizedDialect === 'postgresql') {
    return new Pool({
      host: connection.host,
      user: connection.user,
      password: connection.password,
      database: connection.database,
      port: connection.port || 5432,
      max: poolOptions.max || 10,
      idleTimeoutMillis: poolOptions.idleTimeout || 30000,
      connectionTimeoutMillis: poolOptions.connectionTimeout || 30000,
      ssl: poolOptions.ssl ? { rejectUnauthorized: false } : false,
    });
  }

  throw new Error(`Unsupported dialect for pool: ${dialect}`);
}

/**
 * Executes queries using a connection pool
 * @param {Object} pool - Database connection pool
 * @param {string} dialect - Database dialect
 * @param {string|Array} query - SQL query or parameterized query
 * @returns {Promise<Object>} Query results
 */
export async function executeWithPool(pool, dialect, query) {
  const startTime = Date.now();

  if (!query || (typeof query !== 'string' && !Array.isArray(query))) {
    throw new Error('Query is required and must be a string or array [query, params]');
  }

  try {
    const normalizedDialect = dialect.toLowerCase();
    
    if (normalizedDialect === 'mysql') {
      let rows, fields;
      if (Array.isArray(query)) {
        [rows, fields] = await pool.execute(query[0], query[1]);
      } else {
        [rows, fields] = await pool.execute(query);
      }

      const executionTime = Date.now() - startTime;
      return {
        data: rows,
        fields: fields,
        rowCount: Array.isArray(rows) ? rows.length : null,
        executionTime,
        dialect: 'mysql'
      };
    }

    if (normalizedDialect === 'postgres' || normalizedDialect === 'postgresql') {
      let res;
      if (Array.isArray(query)) {
        res = await pool.query(query[0], query[1]);
      } else {
        res = await pool.query(query);
      }

      const executionTime = Date.now() - startTime;
      return {
        data: res.rows,
        fields: res.fields,
        rowCount: res.rowCount,
        executionTime,
        dialect: 'postgresql'
      };
    }

    throw new Error(`Unsupported dialect for pool execution: ${dialect}`);

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`❌ Pool query failed (${dialect}):`, error.message);
    
    const enhancedError = new Error(`Pool execution failed: ${error.message}`);
    enhancedError.originalError = error;
    enhancedError.executionTime = executionTime;
    enhancedError.dialect = dialect;
    
    throw enhancedError;
  }
}