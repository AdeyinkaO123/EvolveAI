import os
import asyncio
import random
import io
import uuid as uuid_lib
from fastapi import FastAPI, Form, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv
import PyPDF2
import docx
from supabase import create_client, Client
from browser_agent import browse_product_url, format_browser_context
from research_agent import research_competitive_landscape, generate_persona_with_research
from interview_agent import chat_with_persona

load_dotenv()

app = FastAPI(title="Evolve AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Auth ──────────────────────────────────────────────────────────────────────

_bearer = HTTPBearer()


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(_bearer)) -> dict:
    token = credentials.credentials
    try:
        response = _db.auth.get_user(token)
        user = response.user
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return {"sub": str(user.id), "email": user.email}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token.")


# ─── Supabase DB client (service role — server-side only) ─────────────────────

_db: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY"),
)


def _save_session(
    user_id: str,
    input_type: str,
    product_text: str,
    personas: list,
    db_session_id: str = None,
) -> str:
    """Persist a generation run. If db_session_id is given, append personas to it."""
    sid = db_session_id or str(uuid_lib.uuid4())
    if not db_session_id:
        _db.table("sessions").insert({
            "id": sid,
            "user_id": user_id,
            "input_type": input_type,
            "product_text": product_text,
        }).execute()
    _db.table("personas").insert([
        {"session_id": sid, "persona_data": p} for p in personas
    ]).execute()
    return sid


# ─── In-memory session store (for live chat within a server session) ───────────
_persona_store: dict = {}
_product_context_store: dict = {}

# ─── Persona pools ─────────────────────────────────────────────────────────────

PERSONA_NAMES = [
    "Marcus Webb", "Priya Nair", "Jordan Ellis", "Fatima Al-Hassan", "Tyler Brooks",
    "Chloe Tanaka", "DeShawn Rivers", "Amara Osei", "Liam Fitzgerald", "Yuki Mori",
    "Valentina Cruz", "Nolan Park", "Simone Dubois", "Kofi Mensah", "Ingrid Larsen",
    "Aarav Sharma", "Brianna Cole", "Ezra Goldstein", "Mei-Ling Chen", "Rafael Torres",
    "Zara Ahmed", "Owen MacLeod", "Tasha Vance", "Diego Herrera", "Nadia Petrov",
    "Cameron Obi", "Leila Farouk", "Jasper Quinn", "Aiko Sato", "Malik Johnson",
]

SEGMENTS = [
    "Early Adopter", "Enterprise User", "SMB Owner", "Power User",
    "Casual User", "Tech Skeptic", "Decision Maker", "Startup Founder",
    "Freelancer", "Product Manager",
]

TONES = [
    "enthusiastic and quick to adopt new tools",
    "skeptical and cautious about new software",
    "pragmatic and focused purely on ROI",
    "detail-oriented and technical",
    "non-technical and values simplicity above all",
    "a busy executive with little patience for complexity",
    "a power user who wants deep customization",
    "price-sensitive and comparing alternatives",
    "a longtime user of competing tools",
    "someone who makes decisions based on peer recommendations",
]

AVATAR_COLORS = [
    "#E8C547", "#F07B54", "#6BCFB0", "#9B8FE8", "#F4A5C0",
    "#5CB8E4", "#E87B9B", "#7DC97D", "#F0C060", "#A07BC8",
    "#60B8D8", "#E8A870", "#80C8A0", "#D870A8", "#70B870",
    "#F07070", "#60A8F0", "#E8D050", "#90D8A0", "#D898E8",
]


# ─── Helpers ───────────────────────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs)


async def run_pipeline(
    product_context: str,
    count: int = 20,
    start_index: int = 0,
    session_id: str = None,
) -> list:
    names = random.sample(PERSONA_NAMES, min(count, len(PERSONA_NAMES)))
    if count > len(names):
        names += random.choices(PERSONA_NAMES, k=count - len(names))

    segments = random.choices(SEGMENTS, k=count)
    tones = random.choices(TONES, k=count)
    colors = [AVATAR_COLORS[(start_index + i) % len(AVATAR_COLORS)] for i in range(count)]

    print("Running competitive research...")
    competitive_intel = await research_competitive_landscape(product_context, segments)
    print(f"Competitors identified: {competitive_intel.get('competitors', [])}")

    tasks = [
        generate_persona_with_research(
            persona_name=names[i],
            segment=segments[i],
            tone=tones[i],
            color=colors[i],
            product_context=product_context,
            competitive_intel=competitive_intel,
            persona_index=start_index + i,
        )
        for i in range(count)
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    personas = []
    for i, r in enumerate(results):
        if isinstance(r, Exception):
            print(f"Persona {start_index + i} failed: {r}")
        else:
            if session_id:
                _persona_store[f"{session_id}_{r['id']}"] = r
            personas.append(r)

    return personas


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "Evolve AI is running ✓"}


@app.post("/generate")
async def generate_from_text(
    text: str = Form(...),
    count: int = Form(20),
    start_index: int = Form(0),
    db_session_id: str = Form(None),
    user: dict = Depends(verify_token),
):
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text input is required."})
    session_id = user["sub"]
    _product_context_store[session_id] = text
    personas = await run_pipeline(text, count=count, start_index=start_index, session_id=session_id)
    sid = await asyncio.to_thread(_save_session, user["sub"], "text", text, personas, db_session_id or None)
    return {"personas": personas, "total": len(personas), "session_id": session_id, "db_session_id": sid}


@app.post("/generate-from-file")
async def generate_from_file(
    file: UploadFile = File(...),
    count: int = Form(20),
    start_index: int = Form(0),
    db_session_id: str = Form(None),
    user: dict = Depends(verify_token),
):
    file_bytes = await file.read()
    filename = file.filename.lower()

    if filename.endswith(".pdf"):
        text = extract_text_from_pdf(file_bytes)
    elif filename.endswith(".docx"):
        text = extract_text_from_docx(file_bytes)
    elif filename.endswith(".txt"):
        text = file_bytes.decode("utf-8", errors="ignore")
    else:
        return JSONResponse(status_code=400, content={"error": "Unsupported file type. Please upload a PDF, DOCX, or TXT file."})

    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Could not extract any text from this file."})

    session_id = user["sub"]
    _product_context_store[session_id] = text
    personas = await run_pipeline(text, count=count, start_index=start_index, session_id=session_id)
    sid = await asyncio.to_thread(_save_session, user["sub"], "file", text, personas, db_session_id or None)
    return {"personas": personas, "total": len(personas), "session_id": session_id, "db_session_id": sid}


@app.post("/generate-from-url")
async def generate_from_url(
    url: str = Form(...),
    count: int = Form(20),
    start_index: int = Form(0),
    db_session_id: str = Form(None),
    user: dict = Depends(verify_token),
):
    try:
        browse_result = await browse_product_url(url)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Browser agent failed: {str(e)}"})

    if not browse_result.get("full_text_summary", "").strip():
        return JSONResponse(status_code=400, content={"error": "No readable content found at that URL."})

    product_context = format_browser_context(browse_result)
    session_id = user["sub"]
    _product_context_store[session_id] = product_context
    personas = await run_pipeline(product_context, count=count, start_index=start_index, session_id=session_id)
    sid = await asyncio.to_thread(_save_session, user["sub"], "url", product_context, personas, db_session_id or None)

    return {
        "personas": personas,
        "total": len(personas),
        "session_id": session_id,
        "db_session_id": sid,
        "browse_summary": {
            "headlines": browse_result.get("headlines", [])[:5],
            "ctas": browse_result.get("ctas", [])[:5],
            "pricing_found": len(browse_result.get("pricing", [])) > 0,
            "pages": browse_result.get("pages_visited", []),
        },
    }


class ChatMessage(BaseModel):
    session_id: str
    persona_id: int
    message: str
    history: list = []


@app.post("/interview/chat")
async def chat_interview(body: ChatMessage, _user: dict = Depends(verify_token)):
    key = f"{body.session_id}_{body.persona_id}"
    persona = _persona_store.get(key)
    product_context = _product_context_store.get(body.session_id)

    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found.")
    if not product_context:
        raise HTTPException(status_code=404, detail="Session not found.")

    reply = await chat_with_persona(
        persona=persona,
        product_context=product_context,
        conversation_history=body.history,
        user_message=body.message,
    )

    return {"persona_id": body.persona_id, "persona_name": persona["name"], "reply": reply}


# ─── Demo endpoints (no auth, capped at 5 personas) ──────────────────────────

@app.post("/demo/generate")
async def demo_generate(text: str = Form(...)):
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text input is required."})
    session_id = f"demo_{str(uuid_lib.uuid4())}"
    _product_context_store[session_id] = text
    personas = await run_pipeline(text, count=5, start_index=0, session_id=session_id)
    return {"personas": personas, "session_id": session_id}


@app.post("/demo/interview/chat")
async def demo_chat(body: ChatMessage):
    if not body.session_id.startswith("demo_"):
        raise HTTPException(status_code=403, detail="Invalid demo session.")
    key = f"{body.session_id}_{body.persona_id}"
    persona = _persona_store.get(key)
    product_context = _product_context_store.get(body.session_id)
    if not persona:
        raise HTTPException(status_code=404, detail="Demo session expired — please regenerate.")
    if not product_context:
        raise HTTPException(status_code=404, detail="Demo session expired — please regenerate.")
    reply = await chat_with_persona(
        persona=persona,
        product_context=product_context,
        conversation_history=body.history,
        user_message=body.message,
    )
    return {"persona_id": body.persona_id, "persona_name": persona["name"], "reply": reply}


# ─── History endpoints ────────────────────────────────────────────────────────

@app.get("/sessions")
async def get_sessions(user: dict = Depends(verify_token)):
    result = _db.table("sessions").select(
        "id, input_type, product_text, created_at"
    ).eq("user_id", user["sub"]).order("created_at", desc=True).limit(20).execute()

    return {"sessions": [
        {
            "id": s["id"],
            "input_type": s["input_type"],
            "title": (s.get("product_text") or "")[:80].strip(),
            "created_at": s["created_at"],
        }
        for s in result.data
    ]}


@app.get("/sessions/{db_session_id}")
async def load_session(db_session_id: str, user: dict = Depends(verify_token)):
    session_res = _db.table("sessions").select("*").eq(
        "id", db_session_id
    ).eq("user_id", user["sub"]).maybe_single().execute()

    if not session_res.data:
        raise HTTPException(status_code=404, detail="Session not found.")

    session = session_res.data
    personas_res = _db.table("personas").select("persona_data").eq(
        "session_id", db_session_id
    ).execute()
    personas = [row["persona_data"] for row in personas_res.data]

    # Restore in-memory state so live chat works immediately
    uid = user["sub"]
    _product_context_store[uid] = session["product_text"]
    for p in personas:
        _persona_store[f"{uid}_{p['id']}"] = p

    return {"personas": personas, "session_id": uid, "db_session_id": db_session_id}


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
