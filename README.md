# 🧠 Natural Language to SQL Query Converter (Updated)

An advanced full-stack web application that converts natural language into SQL queries using AI models like **OpenAI** or **OpenRouter**.

> ✅ Now with **Multi-SQL Dialect Support** — MySQL, PostgreSQL, SQLite, MSSQL, and more!

---

## 📁 Project Structure

```
openai-sql-generator/
├── client/     → React frontend (Vite)
├── server/     → Node.js + Express backend
```

---

## 🚀 Features

- ✅ Convert plain English into SQL queries
- 🌐 **Supports multiple SQL dialects** (MySQL, PostgreSQL, SQLite, MSSQL, etc.)
- 📋 One-click “Copy SQL” button
- 🧠 Uses OpenAI or OpenRouter API
- 💡 Clean, responsive, and fast UI
- 🛡️ Error handling and loading states
- 🛠️ Modular and scalable codebase

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/openai-sql-generator.git
cd openai-sql-generator
```

### 2. Install Dependencies

**Client:**

```bash
cd client
npm install
```

**Server:**

```bash
cd ../server
npm install
```

---

## 🔐 API Configuration

Create a `.env` file inside the `server/` folder and add your API key:

```env
# Use one of the following:
OPENAI_API_KEY=your_openai_key_here
# or
OPENROUTER_API_KEY=your_openrouter_key_here
```

Get your API key from:

- 🔹 [OpenAI](https://platform.openai.com/account/api-keys)
- 🔹 [OpenRouter (Free)](https://openrouter.ai)

---

## ▶️ Running the App

### Start Backend (Port: 5000)

```bash
cd server
npm run dev
```

### Start Frontend (Port: 5173)

```bash
cd ../client
npm run dev
```

Open your browser at: [http://localhost:5173](http://localhost:5173)

---

## 🛠 Built With

- **Frontend**: React + Vite  
- **Backend**: Node.js + Express  
- **Styling**: CSS + Inline Styles  
- **AI Models**: OpenAI / OpenRouter  
- **SQL Dialects Supported**: MySQL, PostgreSQL, SQLite, MSSQL, etc.

---

## 📜 License

This project is open-source under the [MIT License](LICENSE).

---

## 🙌 Acknowledgements

- [OpenAI](https://platform.openai.com/)
- [OpenRouter](https://openrouter.ai)
- Vite, React, Node.js, Express

---
