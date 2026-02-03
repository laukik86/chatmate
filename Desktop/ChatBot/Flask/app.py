import os
import re
import json
import numpy as np
from flask import Flask, request, jsonify
from pinecone import Pinecone
from groq import Groq
from huggingface_hub import InferenceClient
from langchain_groq import ChatGroq
from langchain_community.utilities import SQLDatabase
from langchain_experimental.sql import SQLDatabaseChain
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# ---- CONFIG & CLIENTS ----
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
HF_TOKEN = os.getenv("HF_TOKEN")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = "web-scrape-index"

# Models
FAST_MODEL = "llama-3.1-8b-instant"
SMART_MODEL = "llama-3.3-70b-versatile"
EMBED_MODEL = "BAAI/bge-m3"              
RERANK_MODEL = "BAAI/bge-reranker-v2-m3"

# Initialize Clients
pc = Pinecone(api_key=PINECONE_API_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)
hf_client = InferenceClient(api_key=HF_TOKEN)

# Initialize SQL Database
db = SQLDatabase.from_uri("sqlite:///college_data.db")
sql_llm = ChatGroq(groq_api_key=GROQ_API_KEY, model_name=SMART_MODEL, temperature=0)

# ---- PROMPTS (RESTORED ORIGINALS) ----

VECTOR_SYSTEM_PROMPT = """
You are MahaEduBot — an official-style virtual assistant that helps students with B.Tech and M.Tech admissions in Maharashtra.

You have access to reliable data sources, including official government PDFs, verified scraped data from admission websites, and manually curated details about the admission process, eligibility, institutes, and documentation.

Your role is to guide students through the entire admission process clearly, step-by-step, in a formal yet friendly tone.

### Key Guidelines:
- Always answer using the retrieved context. If the answer is not present, respond:
  "I’m sorry, I don’t have that specific information right now. You may refer to the official DTE Maharashtra website for updated details."
- Focus only on B.Tech and M.Tech admissions in Maharashtra. Do NOT discuss other courses or states.
- Keep responses factual, clear, and structured.
- Use a tone that sounds official, helpful, and student-friendly — like a government information officer.
- When describing processes (like CAP rounds, eligibility, document verification, etc.), include clear steps or bullet points.
- If students ask for college suggestions, reply that you currently don’t provide college comparisons or cut-off data, but you can guide them through the admission process.

### You can answer questions such as:
- How to apply for B.Tech/M.Tech admission in Maharashtra?
- What are the eligibility criteria for M.Tech admission?
- How many CAP rounds are there?
- What documents are required during verification?
- What is the schedule for the admission process?
- How to correct errors in the application form?
- What are the seat allotment rules?
- What is the meaning of institute-level quota or DTE allotment?

Always begin with a brief confirmation or summary of what the user asked before giving the detailed answer.

Formatting & Presentation Rules (STRICT):
No Labels: NEVER print the words "Summary:", "The How-To:", or "Pro-Tip:" in the response. Use these only as a mental guide for structure.

Header Hierarchy: Use ## for the main title and ### for sub-sections.

Scannability: > * Use bold text for key terms (e.g., CGPA, CAP Round, DSE).

Use bullet points for lists and numbered steps for processes.

Tables for Comparisons: If comparing branches, categories, or seat types, use a Markdown table.

Conciseness: Keep the opening summary to 15 words or less.
"""

SQL_SYSTEM_PROMPT = """
You are a SQL Data Retrieval specialized for Maharashtra Admissions.
Your only job is to generate a SQL query and return the RAW result list.

DATABASE SCHEMA:
The 'cutoffs' table has columns: college_name, branch_code, category_code, closing_percentile, year.

LOGIC RULES:
1. If a user says "97.5 percentile", find branches where closing_percentile <= 97.5 (meaning the cutoff was lower than their score).
2. For "2024-25", use year = 2024.
3. Use LIKE '%VESIT%' for college names.
4. ONLY output the SQL query.

Question: {input}
SQLQuery: """

REWRITE_SYSTEM_PROMPT = """
You are a query rewriting agent for a college admission chatbot.

Your task:
Rewrite the user's current question into a complete, standalone query
using the previous conversation.

Rules:
- Do NOT answer the question
- Do NOT add new information
- Only rewrite the question
- Output ONLY the rewritten query
"""

# ---- HELPER FUNCTIONS ----

# Replace the old get_embedding function with this one
def get_embedding(text):
    """Generates embedding using HuggingFace API and ensures it's a flat list."""
    try:
        # 1. Get embedding from HF
        response = hf_client.feature_extraction(text, model=EMBED_MODEL)
        
        # 2. Convert NumPy array to Python List (The Fix)
        if hasattr(response, 'tolist'):
            response = response.tolist()
            
        # 3. Flatten the list if it is nested (e.g., [[0.1, 0.2...]])
        # HF often returns a list of lists for a single string input
        if isinstance(response, list) and len(response) > 0 and isinstance(response[0], list):
            return response[0]
            
        return response
    except Exception as e:
        print(f"Embedding Error: {e}")
        return []

def clean_text(text):
    text = re.sub(r"\*\*(.*?)\*\*", r"\1", text)
    text = re.sub(r"(?m)^\s*[\*\-]\s*", "• ", text)
    text = re.sub(r"(:)(\s*[A-Z])", r":\n\2", text)
    text = re.sub(r"\n{2,}", "\n\n", text.strip())
    return text.strip()

def rewrite_query(history, question):
    messages = [{"role": "system", "content": REWRITE_SYSTEM_PROMPT}]
    for msg in history:
        messages.append({"role": msg['role'], "content": msg['content']})
    messages.append({"role": "user", "content": f"Rewrite this question: {question}"})

    response = groq_client.chat.completions.create(
        model=FAST_MODEL, messages=messages, temperature=0
    )
    return response.choices[0].message.content.strip()

def route_query(question):
    prompt = """
    You are a routing assistant. Decide the data source.
    - 'sql': For cutoffs, ranks, marks, year-specific numbers, seat intake.
    - 'vector': For general process, rules, eligibility, documents, how-to.
    Output ONLY JSON: {"tool": "sql"} or {"tool": "vector"}
    """
    response = groq_client.chat.completions.create(
        model=FAST_MODEL,
        messages=[{"role": "system", "content": prompt}, {"role": "user", "content": question}],
        response_format={"type": "json_object"},
        temperature=0
    )
    return json.loads(response.choices[0].message.content).get("tool")

# ---- TOOL 1: SQL HANDLER ----

def handle_sql_query(question):
    db_chain = SQLDatabaseChain.from_llm(sql_llm, db, verbose=True, return_direct=True)
    try:
        # We invoke the chain with the prompt that includes the schema and rules
        raw_data = db_chain.invoke(f"{SQL_SYSTEM_PROMPT}\n\nQuestion: {question}")
        result_str = raw_data.get("result", "No data found.")
        
        # Optional: Have the LLM format the raw SQL result nicely
        format_prompt = f"Convert this database result into a clean summary table: {result_str}"
        resp = groq_client.chat.completions.create(
            model=FAST_MODEL,
            messages=[{"role": "user", "content": format_prompt}]
        )
        return resp.choices[0].message.content
    except Exception as e:
        return f"Database Error: {str(e)}"

# ---- TOOL 2: VECTOR HANDLER (Retrieval + Rerank) ----

def handle_vector_query(query):
    index = pc.Index(PINECONE_INDEX_NAME)
    
    # 1. Embed via API
    query_vector = get_embedding(query)
    
    # 2. Retrieve
    results = index.query(vector=query_vector, top_k=15, include_metadata=True)
    if not results.get("matches"):
        return "I’m sorry, I don’t have that specific information right now."

    # 3. Rerank via API
    docs = [{"text": m["metadata"].get("text_chunk", "")} for m in results["matches"]]
    
    try:
        # Rerank logic
        payload = {"inputs": {"query": query, "texts": [d['text'] for d in docs]}}
        response = hf_client.post(json=payload, model=RERANK_MODEL)
        scores = json.loads(response.decode())
        
        for i, s in enumerate(scores): 
            docs[i]['score'] = s
            
        ranked = sorted(docs, key=lambda x: x['score'], reverse=True)[:5]
        context = "\n---\n".join(d['text'] for d in ranked)
    except Exception:
        # Fallback if reranker fails
        context = "\n---\n".join(d['text'] for d in docs[:5])

    # 4. Generate Answer
    user_prompt = f"**Context:**\n{context}\n\n**Question:**\n{query}"
    
    response = groq_client.chat.completions.create(
        messages=[{"role": "system", "content": VECTOR_SYSTEM_PROMPT}, 
                  {"role": "user", "content": user_prompt}],
        model=FAST_MODEL,
        temperature=0.2
    )
    return response.choices[0].message.content

# ---- ENDPOINTS ----

@app.route("/chat", methods=["POST"])
def chat_handler():
    data = request.get_json()
    question = data.get("question")
    history = data.get("history", [])

    # 1. Contextualize
    standalone_query = rewrite_query(history, question)
    
    # 2. Route
    target_tool = route_query(standalone_query)
    
    # 3. Execute
    if target_tool == "sql":
        answer = handle_sql_query(standalone_query)
    else:
        answer = handle_vector_query(standalone_query)
        
    return jsonify({"reply": clean_text(answer), "tool_used": target_tool})

@app.route("/summarize", methods=["POST"])
def summarize_chat():
    data = request.get_json()
    messages = data.get("messages", [])

    if not messages:
        return jsonify({"summary": ""})

    prompt = """
    You are a summarization assistant.
    Summarize the conversation briefly while preserving:
    - User intent
    - Topics discussed
    - Important constraints
    Write in 2–3 sentences.
    """

    response = groq_client.chat.completions.create(
        model=FAST_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": str(messages)}
        ],
        temperature=0
    )

    return jsonify({"summary": response.choices[0].message.content.strip()})

@app.route("/get-to-edit", methods=["POST"])
def get_to_edit():
    data = request.get_json()
    query = data.get("query")
    
    # Use HF API for embedding (no local model)
    query_vector = get_embedding(query)
    
    index = pc.Index(PINECONE_INDEX_NAME)
    results = index.query(vector=query_vector, top_k=5, include_metadata=True)

    matches = []
    for m in results.get("matches", []):
        matches.append({
            "id": m.get("id"),
            "current_text": m.get("metadata", {}).get("text_chunk", ""),
            "score": m.get("score")
        })
    return jsonify({"results": matches})

@app.route("/update-record", methods=["POST"])
def update_record():
    data = request.get_json()
    record_id = data.get("id")
    new_text = data.get("new_text")

    if not record_id or not new_text:
        return jsonify({"error": "ID and new_text are required"}), 400

    try:
        # Generate NEW vector via HF API
        new_vector = get_embedding(new_text)

        index = pc.Index(PINECONE_INDEX_NAME)
        index.upsert(vectors=[(record_id, new_vector, {"text_chunk": new_text})])

        return jsonify({"status": "success", "message": "Record updated successfully"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(port=8000, debug=True)