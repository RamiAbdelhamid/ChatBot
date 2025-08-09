# -------------------------------------------------------------------
# FastAPI + LangChain (Groq) minimal chat backend
# Notes:
# - Requires GROQ_API_KEY as an environment variable (local & Render).
# - CORS is restricted to your React domains (update ALLOWED_ORIGINS).
# - In-memory "sessions" is demo-only; use Redis/DB in production.
# - Added HEAD /health for uptime monitors (e.g., UptimeRobot).
# -------------------------------------------------------------------

import os, traceback
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI()

# CORS: allow only your frontend domains (Render static site + local dev).
ALLOWED_ORIGINS = [
    "https://chatbot-1-ao6t.onrender.com",  # Frontend (Render)
    "http://localhost:5173",                # Local dev (Vite)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # Allowed origins for the browser
    allow_methods=["*"],            # Allow all methods (GET/POST/OPTIONS…)
    allow_headers=["*"],            # Allow all headers
    allow_credentials=False,        # Keep False unless you use cookies/auth
)

# Simple prompt; you can switch to ChatPromptTemplate.from_messages(...) later
# for richer system/human messages and multilingual behavior.
template = """
Answer the question below.

Here is the conversation history:
{context}

Question:
{question}

Answer:
"""
prompt = ChatPromptTemplate.from_template(template)

# Model selection via env; defaults to a safe Groq model.
# IMPORTANT: GROQ_API_KEY must be set in the environment.
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
llm = ChatGroq(model=GROQ_MODEL, temperature=0)  # Reads GROQ_API_KEY automatically

# LangChain pipeline: prompt -> LLM
chain = prompt | llm

# Request schema for /chat
class ChatRequest(BaseModel):
    session_id: str  # Client-generated session id (stored in localStorage)
    message: str     # User message

# In-memory session store (demo only). Use Redis/DB for production.
sessions: dict[str, str] = {}

# Root: quick health/info check
@app.get("/")
def root():
    return {"ok": True, "model": GROQ_MODEL}

# Liveness endpoint (used by frontend warm-up and uptime monitors)
@app.get("/health")
def health():
    return {"status": "healthy"}

# HEAD /health to avoid 405 from some monitors (e.g., HEAD checks)
@app.head("/health")
def health_head():
    return Response(status_code=200)

# Main chat endpoint:
# - Retrieves previous context by session_id
# - Invokes the chain
# - Updates the context buffer
@app.post("/chat")
def chat(req: ChatRequest):
    ctx = sessions.get(req.session_id, "")
    try:
        out = chain.invoke({"context": ctx, "question": req.message})
        reply = getattr(out, "content", out)  # Handle LC message objects
    except Exception as e:
        # Log full traceback for debugging; return a friendly error to client
        print(traceback.format_exc())
        reply = f"LLM error: {e}"
    # Append to conversation context (consider truncating in production)
    sessions[req.session_id] = f"{ctx}\nUser: {req.message}\nAI: {reply}"
    return {"reply": reply}

# Reset a specific session's context (useful for a "Reset" button in UI)
@app.post("/reset/{session_id}")
def reset(session_id: str):
    sessions.pop(session_id, None)
    return {"ok": True}


