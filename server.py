# # server.py
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from langchain_ollama import OllamaLLM
# from langchain_core.prompts import ChatPromptTemplate

# app = FastAPI()
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# template = """
# Answer the question below.

# Here is the conversation history:
# {context}

# Question:
# {question}

# Answer:
# """
# prompt = ChatPromptTemplate.from_template(template)
# model = OllamaLLM(model="llama3")
# chain = prompt | model

# class ChatRequest(BaseModel):
#     session_id: str
#     message: str

# sessions: dict[str, str] = {}

# @app.post("/chat")
# def chat(req: ChatRequest):
#     ctx = sessions.get(req.session_id, "")
#     result = chain.invoke({"context": ctx, "question": req.message})
#     sessions[req.session_id] = f"{ctx}\nUser: {req.message}\nAI: {result}"
#     return {"reply": result}

# @app.post("/reset/{session_id}")
# def reset(session_id: str):
#     sessions.pop(session_id, None)
#     return {"ok": True}
# server.py (بديل سريع لـ Ollama)
import os, traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
  allow_origins=["https://chatbot-80qm.onrender.com","http://localhost:5173"],
  allow_methods=["*"],
  allow_headers=["*"]
)

template = """
Answer the question below.

Here is the conversation history:
{context}

Question:
{question}

Answer:
"""
prompt = ChatPromptTemplate.from_template(template)

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-70b-8192")
llm = ChatGroq(model=GROQ_MODEL, temperature=0)  # يحتاج GROQ_API_KEY
chain = prompt | llm

class ChatRequest(BaseModel):
    session_id: str
    message: str

sessions: dict[str, str] = {}

@app.get("/")
def root():
    return {"ok": True, "model": GROQ_MODEL}

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.post("/chat")
def chat(req: ChatRequest):
    ctx = sessions.get(req.session_id, "")
    try:
        out = chain.invoke({"context": ctx, "question": req.message})
        reply = getattr(out, "content", out)
    except Exception as e:
        print(traceback.format_exc())
        reply = f"LLM error: {e}"
    sessions[req.session_id] = f"{ctx}\nUser: {req.message}\nAI: {reply}"
    return {"reply": reply}

@app.post("/reset/{session_id}")
def reset(session_id: str):
    sessions.pop(session_id, None)
    return {"ok": True}
