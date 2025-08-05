"use client"

import { useState } from "react"
import { ToastContainer, toast } from "react-toastify"
import "react-toastify/dist/ReactToastify.css"
import "./App.css"
import sqlServerIcon from "./assets/sql-server.png"

function App() {
  const [prompt, setPrompt] = useState("")
  const [sqlResult, setSqlResult] = useState("")
  const [executionResult, setExecutionResult] = useState("")
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [dialect, setDialect] = useState("mysql")

  // Professional Features
  const [isVoiceMode, setIsVoiceMode] = useState(false)
  const [sqlExplain, setSqlExplain] = useState("")
  const [showExplain, setShowExplain] = useState(false)
  const [advancedMode, setAdvancedMode] = useState(false)
  const [queryStats, setQueryStats] = useState({ chars: 0, words: 0, complexity: "Simple" })
  const [aiThinking, setAiThinking] = useState("")
  const [showThinking, setShowThinking] = useState(false)
  
  // Voice functionality improvements
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [isProcessingVoice, setIsProcessingVoice] = useState(false)
  const [voiceConfidence, setVoiceConfidence] = useState(0)

  // Enhanced Voice Recognition with Better Error Handling
  const startVoiceInput = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Voice input not supported in this browser")
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()

    // Enhanced recognition settings
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"
    recognition.maxAlternatives = 3

    setIsVoiceMode(true)
    setVoiceTranscript("")
    setIsProcessingVoice(false)
    toast.info("Voice recognition started")

    let finalTranscript = ""
    let timeoutId = null

    recognition.onresult = (event) => {
      let interimTranscript = ""
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        const confidence = event.results[i][0].confidence
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript
          setVoiceConfidence(confidence || 0.8)
        } else {
          interimTranscript += transcript
        }
      }

      // Show real-time transcript
      setVoiceTranscript(finalTranscript + interimTranscript)
      
      // Auto-stop after pause
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        if (finalTranscript.trim()) {
          recognition.stop()
        }
      }, 2000)
    }

    recognition.onend = () => {
      setIsVoiceMode(false)
      if (finalTranscript.trim()) {
        setPrompt(finalTranscript.trim())
        setIsProcessingVoice(true)
        toast.success(`Voice captured (${Math.round(voiceConfidence * 100)}% confidence)`)
        
        // Auto-generate SQL after voice input
        setTimeout(() => {
          handleGenerateSQL()
          setIsProcessingVoice(false)
        }, 800)
      } else {
        toast.warn("No speech detected. Please try again.")
      }
    }

    recognition.onerror = (event) => {
      setIsVoiceMode(false)
      setIsProcessingVoice(false)
      
      switch(event.error) {
        case 'no-speech':
          toast.warn("No speech detected. Please speak clearly.")
          break
        case 'audio-capture':
          toast.error("Microphone access denied")
          break
        case 'not-allowed':
          toast.error("Please allow microphone access")
          break
        default:
          toast.error("Voice recognition error")
      }
    }

    recognition.start()
  }

  // Professional AI Processing
  const showAIThinking = async (userPrompt) => {
    setShowThinking(true)
    const thinkingSteps = [
      "Analyzing natural language input",
      "Identifying database entities and relationships",
      "Planning optimal query structure",
      `Generating ${dialect.toUpperCase()} compliant syntax`,
      "Optimizing query performance",
      "Validating syntax and logic",
    ]

    for (let i = 0; i < thinkingSteps.length; i++) {
      setAiThinking(thinkingSteps[i])
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    setShowThinking(false)
  }

  // Advanced Query Analysis
  const analyzeQuery = (text) => {
    const chars = text.length
    const words = text.trim().split(/\s+/).length

    let complexity = "Simple"
    const complexityIndicators = {
      moderate: ["join", "group by", "having", "union", "case when"],
      advanced: ["window", "cte", "recursive", "pivot", "cross apply"],
      expert: ["partition by", "lead", "lag", "dense_rank", "ntile", "exists"],
    }

    const lowerText = text.toLowerCase()

    if (complexityIndicators.expert.some((keyword) => lowerText.includes(keyword))) {
      complexity = "Expert"
    } else if (complexityIndicators.advanced.some((keyword) => lowerText.includes(keyword))) {
      complexity = "Advanced"
    } else if (complexityIndicators.moderate.some((keyword) => lowerText.includes(keyword))) {
      complexity = "Moderate"
    }

    setQueryStats({ chars, words, complexity })
  }

  const handleGenerateSQL = async () => {
    if (!prompt.trim()) {
      toast.warn("Please enter a query description")
      return
    }

    setLoading(true)
    setSqlResult("")
    setShowExplain(false)

    if (advancedMode) {
      await showAIThinking(prompt)
    }

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer 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",
          "HTTP-Referer": "http://localhost:5174/",
          "X-Title": "Natural Language To Sql Generator",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are an expert SQL developer. Generate clean, efficient ${dialect} queries that follow best practices. ${advancedMode ? "Use advanced SQL features including CTEs, window functions, and complex joins when appropriate." : "Focus on readable, maintainable queries."} Return only the SQL query followed by a brief explanation.`,
            },
            {
              role: "user",
              content: `Convert to ${dialect}: ${prompt}`,
            },
          ],
        }),
      })

      const data = await response.json()
      if (data?.choices?.[0]?.message?.content) {
        const result = data.choices[0].message.content.trim()
        setSqlResult(result)
        // setTimeout(() => explainSQL(result), 1000)
        toast.success("SQL query generated successfully")
      } else {
        setSqlResult("Error: No SQL returned from the API")
        toast.error("Failed to generate SQL query")
      }
    } catch (error) {
      console.error("API Error:", error)
      setSqlResult("Error: Failed to connect to the API")
      toast.error("API connection failed")
    }

    setLoading(false)
  }

  const explainSQL = async (sql) => {
    try {
      const cleanSQL = sql.split("\n\n")[0] || sql.split("Explanation:")[0] || sql

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer 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",
          "HTTP-Referer": "http://localhost:5174/",
          "X-Title": "Natural Language To Sql Generator",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "agentica-org/deepcoder-14b-preview:free",
          messages: [
            {
              role: "system",
              content:
                "You are a database instructor. Provide clear, well-formatted explanations of SQL queries. Use proper formatting with sections, bullet points, and clear structure. Break down each component and its purpose in an organized manner.",
            },
            {
              role: "user",
              content: `Provide a well-formatted explanation of this ${dialect} query. Structure your response with clear sections and use proper formatting:

${cleanSQL}`,
            },
          ],
        }),
      })

      const data = await response.json()
      if (data?.choices?.[0]?.message?.content) {
        setSqlExplain(data.choices[0].message.content.trim())
        setShowExplain(true)
      }
    } catch (error) {
      console.error("Explanation error:", error)
    }
  }

  const handleExplainQuery = async () => {
    if (!sqlResult.trim()) {
      toast.warn("Please generate SQL first")
      return
    }

    setExecuting(true)
    setExecutionResult("")

    try {
      const cleanSQL = sqlResult.split("\n\n")[0] || sqlResult.split("Explanation:")[0] || sqlResult

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer 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",
          "HTTP-Referer": "http://localhost:5174/",
          "X-Title": "Natural Language To Sql Generator",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "agentica-org/deepcoder-14b-preview:free",
          messages: [
            {
              role: "system",
              content: `You are an expert database instructor and SQL analyst. Provide extremely detailed, comprehensive explanations of SQL queries based on the original user request. Break down every component, explain the logic flow, discuss performance implications, suggest optimizations, and provide educational insights. Make it very detailed and thorough for learning purposes. Always reference the original user request: "${prompt}"`,
            },
            {
              role: "user",
              content: `The user originally asked: "${prompt}"

For this specific request, provide a very detailed explanation of this ${dialect} query, including:

1. **CONTEXT & PURPOSE**: How this query addresses the user's original request
2. **STEP-BY-STEP BREAKDOWN**: Detailed analysis of each clause and component
3. **DATA FLOW & EXECUTION**: How the database engine processes this query
4. **PERFORMANCE ANALYSIS**: Potential bottlenecks and optimization opportunities
5. **ALTERNATIVE APPROACHES**: Different ways to achieve the same result
6. **BEST PRACTICES**: What makes this query good/bad and how to improve it
7. **REAL-WORLD USAGE**: When and where you'd use this type of query
8. **POTENTIAL ISSUES**: Common pitfalls and how to avoid them

Generated SQL Query:
${cleanSQL}`,
            },
          ],
        }),
      })

      const data = await response.json()
      if (data?.choices?.[0]?.message?.content) {
        const detailedExplanation = data.choices[0].message.content.trim()

        const formattedResult = `🔍 COMPREHENSIVE QUERY EXPLANATION

📋 ORIGINAL REQUEST: "${prompt}"
🗄️ DATABASE DIALECT: ${dialect.toUpperCase()}
📊 QUERY COMPLEXITY: ${queryStats.complexity}

${detailedExplanation}

📈 QUERY ANALYSIS SUMMARY:
• Input Characters: ${queryStats.chars}
• Input Words: ${queryStats.words}
• Complexity Level: ${queryStats.complexity}
• SQL Dialect: ${dialect.toUpperCase()}
• Query Structure: ${sqlResult.toLowerCase().includes("join") ? "Multi-table operation" : "Single-table operation"}
• Aggregation Functions: ${sqlResult.toLowerCase().includes("count") || sqlResult.toLowerCase().includes("sum") || sqlResult.toLowerCase().includes("avg") ? "Present" : "None"}
• Filtering Applied: ${sqlResult.toLowerCase().includes("where") ? "Yes" : "No"}
• Sorting Applied: ${sqlResult.toLowerCase().includes("order by") ? "Yes" : "No"}
• Grouping Applied: ${sqlResult.toLowerCase().includes("group by") ? "Yes" : "No"}

💡 LEARNING OUTCOME:
This explanation demonstrates how the natural language request "${prompt}" translates into structured ${dialect} syntax, showcasing ${queryStats.complexity.toLowerCase()}-level database concepts.`

        setExecutionResult(formattedResult)
        toast.success("Detailed query explanation generated successfully")
      } else {
        setExecutionResult("Error: Failed to generate detailed explanation")
        toast.error("Explanation generation failed")
      }
    } catch (error) {
      console.error("Explanation error:", error)
      setExecutionResult("Error: Query explanation failed")
      toast.error("Query explanation failed")
    }

    setExecuting(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(sqlResult)
    toast.info("SQL copied to clipboard")
  }

  const handleClear = () => {
    setPrompt("")
    setSqlResult("")
    setExecutionResult("")
    setSqlExplain("")
    setShowExplain(false)
    setQueryStats({ chars: 0, words: 0, complexity: "Simple" })
    toast("Interface cleared")
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setPrompt(value)
    analyzeQuery(value)
  }

  const beautifySQL = () => {
    if (!sqlResult) return

    const beautified = sqlResult
      .replace(/SELECT/gi, "\nSELECT")
      .replace(/FROM/gi, "\nFROM")
      .replace(/WHERE/gi, "\nWHERE")
      .replace(/JOIN/gi, "\n  JOIN")
      .replace(/LEFT JOIN/gi, "\n  LEFT JOIN")
      .replace(/RIGHT JOIN/gi, "\n  RIGHT JOIN")
      .replace(/INNER JOIN/gi, "\n  INNER JOIN")
      .replace(/ORDER BY/gi, "\nORDER BY")
      .replace(/GROUP BY/gi, "\nGROUP BY")
      .replace(/HAVING/gi, "\nHAVING")
      .replace(/,/g, ",\n  ")
      .replace(/AND/gi, "\n  AND")
      .replace(/OR/gi, "\n  OR")
      .trim()

    setSqlResult(beautified)
    toast.success("SQL formatting applied")
  }

  return (
    <div style={styles.wrapper}>
      <div className="header">
        <img src={sqlServerIcon || "/placeholder.svg"} alt="SQL Server Icon" className="logo" />
        <div style={styles.titleSection}>
          <h1>Natural Language to SQL Converter</h1>
          <div style={styles.advancedToggle}>
            <label>
              <input
                type="checkbox"
                checked={advancedMode}
                onChange={(e) => setAdvancedMode(e.target.checked)}
                style={styles.checkbox}
              />
              Advanced SQL Features
            </label>
          </div>
        </div>
      </div>

      {showThinking && (
        <div style={styles.thinkingBox}>
          <div style={styles.thinkingContent}>
            <div style={styles.thinkingSpinner}></div>
            <span style={styles.thinkingText}>{aiThinking}</span>
          </div>
        </div>
      )}

      <div style={styles.controlsRow}>
        <div style={styles.dialectSection}>
          <label style={{ marginRight: "10px", fontWeight: 600 }}>SQL Dialect:</label>
          <select value={dialect} onChange={(e) => setDialect(e.target.value)} style={styles.select}>
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="sqlite">SQLite</option>
            <option value="sqlserver">SQL Server</option>
            <option value="oracle">Oracle</option>
          </select>
        </div>

        {prompt && (
          <div style={styles.statsSection}>
            <span style={styles.stat}>{queryStats.chars} chars</span>
            <span style={styles.stat}>{queryStats.words} words</span>
            <span
              style={{
                ...styles.stat,
                color:
                  queryStats.complexity === "Simple"
                    ? "#10b981"
                    : queryStats.complexity === "Moderate"
                      ? "#f59e0b"
                      : queryStats.complexity === "Advanced"
                        ? "#ef4444"
                        : "#8b5cf6",
              }}
            >
              {queryStats.complexity}
            </span>
          </div>
        )}
      </div>

      {/* Simple Professional Voice Interface */}
      {isVoiceMode && (
        <div style={styles.voiceOverlay}>
          <div style={styles.voiceModal}>
            <div style={styles.voiceHeader}>
              <h3>🎤 Voice Input Active</h3>
              <button 
                onClick={() => setIsVoiceMode(false)}
                style={styles.closeBtn}
              >
                ✕
              </button>
            </div>
            
            <div style={styles.voiceContent}>
              <div style={styles.listeningIndicator}>
                <div style={styles.pulseCircle}></div>
                <span>Listening...</span>
              </div>
              
              {voiceTranscript && (
                <div style={styles.transcriptBox}>
                  <h4>Real-time Transcript:</h4>
                  <p>"{voiceTranscript}"</p>
                  {voiceConfidence > 0 && (
                    <small>Confidence: {Math.round(voiceConfidence * 100)}%</small>
                  )}
                </div>
              )}
              
              <div style={styles.voiceInstructions}>
                <p>💡 <strong>Tips:</strong></p>
                <ul>
                  <li>Speak clearly and naturally</li>
                  <li>Describe your database query in plain English</li>
                  <li>Example: "Show all users older than 25"</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProcessingVoice && (
        <div style={styles.processingBox}>
          <div style={styles.processingContent}>
            <div style={styles.spinner}></div>
            <span>Processing voice input and generating SQL...</span>
          </div>
        </div>
      )}

      <div className="flex-row" style={styles.inputSection}>
        <input
          type="text"
          placeholder="Describe your query in natural language..."
          value={prompt}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === "Enter" && handleGenerateSQL()}
          style={styles.input}
        />

        <button
          onClick={startVoiceInput}
          disabled={isVoiceMode}
          style={{
            ...styles.voiceButton,
            background: isVoiceMode ? "#ef4444" : "#6366f1",
            opacity: isVoiceMode ? 0.8 : 1,
          }}
        >
                    {isVoiceMode ? "🎤 Listening..." : "🎤 Voice Input"}
        </button>

        <button onClick={handleGenerateSQL} disabled={loading} style={styles.button}>
          {loading ? "Generating..." : "Generate SQL"}
        </button>

        <button onClick={handleClear} style={styles.clearButton}>
          Clear All
        </button>
      </div>

      {sqlResult && (
        <div style={styles.outputBlock}>
          <div style={styles.outputHeader}>
            <h3 style={styles.label}>Generated SQL ({dialect.toUpperCase()}):</h3>
            <div style={styles.actionButtons}>
              <button onClick={beautifySQL} style={styles.actionButton}>
                Format
              </button>
              <button
                onClick={handleExplainQuery}
                disabled={executing}
                style={{
                  ...styles.executeButton,
                  background: executing ? "#6b7280" : "#10b981",
                  cursor: executing ? "not-allowed" : "pointer",
                }}
              >
                {executing ? "Explaining..." : "Explain Query"}
              </button>
              <button onClick={handleCopy} style={styles.copyButton}>
                Copy
              </button>
            </div>
          </div>
          <pre style={styles.code}>{sqlResult}</pre>
        </div>
      )}

      {showExplain && sqlExplain && (
        <div style={{ ...styles.outputBlock, borderLeft: "4px solid #f59e0b", marginTop: "1rem" }}>
          <div style={styles.outputHeader}>
            <h3 style={styles.label}>📚 Quick Query Explanation:</h3>
            <button onClick={() => setShowExplain(false)} style={styles.closeButton}>
              ×
            </button>
          </div>
          <div style={styles.formattedExplanation}>
            {sqlExplain.split("\n").map((line, index) => {
              // Handle headers (lines that start with ## or are in ALL CAPS)
              if (line.startsWith("##") || (line.trim() && line === line.toUpperCase() && line.length > 3)) {
                return (
                  <h4 key={index} style={styles.explanationHeader}>
                    {line.replace(/^##\s*/, "")}
                  </h4>
                )
              }

              // Handle bullet points
              if (line.trim().startsWith("•") || line.trim().startsWith("-") || line.trim().startsWith("*")) {
                return (
                  <div key={index} style={styles.bulletPoint}>
                    <span style={styles.bullet}>•</span>
                    <span>{line.replace(/^[\s\-*•]+/, "")}</span>
                  </div>
                )
              }

              // Handle numbered lists
              if (/^\d+\./.test(line.trim())) {
                return (
                  <div key={index} style={styles.numberedPoint}>
                    {line}
                  </div>
                )
              }

              // Handle code snippets (lines that look like SQL)
              if (
                line.trim().toUpperCase().includes("SELECT") ||
                line.trim().toUpperCase().includes("FROM") ||
                line.trim().toUpperCase().includes("WHERE")
              ) {
                return (
                  <pre key={index} style={styles.inlineCode}>
                    {line}
                  </pre>
                )
              }

              // Handle empty lines
              if (!line.trim()) {
                return <br key={index} />
              }

              // Regular paragraphs
              return (
                <p key={index} style={styles.explanationParagraph}>
                  {line}
                </p>
              )
            })}
          </div>
        </div>
      )}

      {executionResult && (
        <div style={{ ...styles.outputBlock, borderLeft: "4px solid #10b981", marginTop: "1rem" }}>
          <h3 style={styles.label}>Detailed Query Explanation:</h3>
          <pre style={{ ...styles.code, color: "#34d399" }}>{executionResult}</pre>
        </div>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
        @keyframes slideIn {
          from { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95); 
          }
          to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
        }
        @keyframes slideOut {
          from { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
          }
          to { 
            opacity: 0; 
            transform: translateY(-20px) scale(0.95); 
          }
        }
      `}</style>
    </div>
  )
}

const styles = {
  wrapper: {
    padding: "3rem 2.5rem",
    maxWidth: "900px",
    margin: "0 auto",
    borderRadius: "18px",
    background: "linear-gradient(135deg, #161a20, #1e2128)",
    border: "1px solid rgba(100, 255, 255, 0.07)",
    boxShadow: "0 0 40px rgba(0, 255, 255, 0.05)",
    animation: "fadeIn 0.7s ease-in-out",
    fontFamily: "Segoe UI, Inter, sans-serif",
    color: "#e2e8f0",
  },
  titleSection: {
    flex: 1,
    marginLeft: "1rem",
  },
  advancedToggle: {
    marginTop: "0.5rem",
    fontSize: "0.9rem",
    color: "#a78bfa",
  },
  checkbox: {
    marginRight: "0.5rem",
    transform: "scale(1.2)",
  },
  thinkingBox: {
    background: "rgba(139, 92, 246, 0.1)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "12px",
    padding: "1rem",
    marginBottom: "1.5rem",
    animation: "fadeInUp 0.3s ease-out",
  },
  thinkingContent: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  thinkingSpinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(139, 92, 246, 0.3)",
    borderTop: "2px solid #8b5cf6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  thinkingText: {
    color: "#a78bfa",
    fontWeight: 500,
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  dialectSection: {
    display: "flex",
    alignItems: "center",
  },
  select: {
    padding: "10px",
    borderRadius: "8px",
    background: "#1f2937",
    color: "#e2e8f0",
    border: "1px solid #3b3f4a",
    fontSize: "0.9rem",
  },
  statsSection: {
    display: "flex",
    gap: "1rem",
    alignItems: "center",
  },
  stat: {
    background: "rgba(255, 255, 255, 0.05)",
    padding: "4px 8px",
    borderRadius: "6px",
    fontSize: "0.8rem",
    fontWeight: 500,
  },

  // Simple Professional Voice Styles
  voiceOverlay: {
    position: "fixed",
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    background: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    animation: "fadeIn 0.3s ease-out",
  },
  voiceModal: {
    background: "linear-gradient(135deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "16px",
    padding: "2.5rem",
    maxWidth: "520px",
    width: "90%",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    animation: "slideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  voiceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    paddingBottom: "1rem",
    borderBottom: "1px solid rgba(55, 65, 81, 0.5)",
  },
  closeBtn: {
    background: "rgba(75, 85, 99, 0.3)",
    border: "1px solid rgba(75, 85, 99, 0.5)",
    borderRadius: "8px",
    color: "#d1d5db",
    fontSize: "1rem",
    cursor: "pointer",
    padding: "0.5rem 0.75rem",
    transition: "all 0.2s ease",
    "&:hover": {
      background: "rgba(239, 68, 68, 0.2)",
      borderColor: "rgba(239, 68, 68, 0.5)",
      color: "#ef4444",
    }
  },
  voiceContent: {
    textAlign: "center",
  },
  listeningIndicator: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginBottom: "2rem",
    padding: "1.5rem",
    background: "rgba(99, 102, 241, 0.08)",
    borderRadius: "12px",
    border: "1px solid rgba(99, 102, 241, 0.2)",
  },
  pulseCircle: {
    width: "16px",
    height: "16px",
    background: "#ef4444",
    borderRadius: "50%",
    animation: "pulse 1.8s ease-in-out infinite",
    boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.7)",
  },
  transcriptBox: {
    background: "rgba(99, 102, 241, 0.08)",
    border: "1px solid rgba(99, 102, 241, 0.25)",
    borderRadius: "12px",
    padding: "1.5rem",
    marginBottom: "1.5rem",
    textAlign: "left",
    animation: "slideIn 0.3s ease-out",
  },
  voiceInstructions: {
    background: "rgba(16, 185, 129, 0.08)",
    border: "1px solid rgba(16, 185, 129, 0.25)",
    borderRadius: "12px",
    padding: "1.5rem",
    textAlign: "left",
  },
  processingBox: {
    position: "fixed",
    top: "24px",
    right: "24px",
    background: "linear-gradient(135deg, #1f2937, #111827)",
    border: "1px solid #374151",
    borderRadius: "12px",
    padding: "1.2rem 1.5rem",
    zIndex: 1001,
    boxShadow: "0 15px 30px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.05)",
    animation: "slideIn 0.3s ease-out",
  },
  processingContent: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    color: "#10b981",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(16, 185, 129, 0.2)",
    borderTop: "2px solid #10b981",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },

  inputSection: {
    display: "flex",
    gap: "10px",
    marginBottom: "1.5rem",
    alignItems: "stretch",
    flexWrap: "wrap",
  },
  input: {
    flex: 1,
    minWidth: "300px",
    padding: "15px 18px",
    fontSize: "1rem",
    color: "#e0f2f1",
    background: "#1f2937",
    border: "1px solid #3b3f4a",
    borderRadius: "12px",
    outline: "none",
  },
  voiceButton: {
    padding: "13px 22px",
    fontSize: "0.9rem",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    fontWeight: 600,
    minWidth: "140px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
    },
    "&:active": {
      transform: "translateY(0)",
    }
  },
  button: {
    minWidth: "160px",
    background: "linear-gradient(135deg, #00f5c9, #03a9f4)",
    color: "#0f1117",
    fontWeight: 600,
    padding: "13px 26px",
    fontSize: "1rem",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(3, 169, 244, 0.25)",
    "&:hover": {
      transform: "translateY(-1px)",
      boxShadow: "0 6px 20px rgba(3, 169, 244, 0.3)",
    },
    "&:active": {
      transform: "translateY(0)",
    }
  },
  clearButton: {
    background: "linear-gradient(135deg, #374151, #4b5563)",
    color: "#e2e8f0",
    fontWeight: 600,
    padding: "13px 26px",
    fontSize: "1rem",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    "&:hover": {
      transform: "translateY(-1px)",
      background: "linear-gradient(135deg, #4b5563, #6b7280)",
      boxShadow: "0 6px 20px rgba(0, 0, 0, 0.2)",
    },
    "&:active": {
      transform: "translateY(0)",
    }
  },
  outputBlock: {
    background: "#111827",
    padding: "1.5rem",
    marginTop: "2rem",
    borderLeft: "4px solid #03a9f4",
    borderRadius: "10px",
    fontFamily: "Fira Code, monospace",
    color: "#7dd3fc",
  },
  outputHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1rem",
    flexWrap: "wrap",
    gap: "10px",
  },
  label: {
    fontWeight: "bold",
    fontSize: "1rem",
    margin: 0,
  },
  actionButtons: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  actionButton: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    background: "#6366f1",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
    fontWeight: 500,
  },
  executeButton: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    color: "#0f1117",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
    fontWeight: 500,
  },
  copyButton: {
    padding: "8px 14px",
    fontSize: "0.85rem",
    background: "#03a9f4",
    color: "#0f1117",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "0.3s",
    fontWeight: 500,
  },
  closeButton: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#ef4444",
    border: "none",
    borderRadius: "6px",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "0.8rem",
  },
  code: {
    whiteSpace: "pre-wrap",
    fontFamily: "Fira Code, monospace",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    color: "#7dd3fc",
    margin: 0,
    wordBreak: "break-word",
  },
  explanation: {
    fontSize: "0.9rem",
    lineHeight: "1.6",
    fontFamily: "Segoe UI, Inter, sans-serif",
  },

  // NEW FORMATTED EXPLANATION STYLES
  formattedExplanation: {
    fontFamily: "Segoe UI, Inter, sans-serif",
    fontSize: "0.95rem",
    lineHeight: "1.7",
    color: "#fbbf24",
  },

  explanationHeader: {
    color: "#fbbf24",
    fontSize: "1.1rem",
    fontWeight: "bold",
    margin: "1.5rem 0 0.8rem 0",
    borderBottom: "2px solid rgba(251, 191, 36, 0.3)",
    paddingBottom: "0.5rem",
  },

  bulletPoint: {
    display: "flex",
    alignItems: "flex-start",
    margin: "0.5rem 0",
    paddingLeft: "1rem",
  },

  bullet: {
    color: "#f59e0b",
    fontWeight: "bold",
    marginRight: "0.8rem",
    fontSize: "1.2rem",
    lineHeight: "1.5",
  },

  numberedPoint: {
    margin: "0.8rem 0",
    paddingLeft: "1rem",
    color: "#fbbf24",
    fontWeight: "500",
  },

  inlineCode: {
    background: "rgba(251, 191, 36, 0.1)",
    border: "1px solid rgba(251, 191, 36, 0.3)",
    borderRadius: "6px",
    padding: "0.8rem",
    margin: "0.8rem 0",
    fontSize: "0.9rem",
    color: "#7dd3fc",
    fontFamily: "Fira Code, monospace",
    overflow: "auto",
  },

  explanationParagraph: {
    margin: "0.8rem 0",
    color: "#e2e8f0",
    lineHeight: "1.6",
  },
}
export default App
