import os
import asyncio
import random
import io
from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import PyPDF2
import docx
from browser_agent import browse_product_url, format_browser_context
from research_agent import research_competitive_landscape, generate_persona_with_research
from interview_agent import generate_auto_interview

load_dotenv()

app = FastAPI(title="Evolve AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── In-memory session store ───────────────────────────────────────────────────
# Holds persona data and product context between requests
# so the interview feature can reference them later
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


def make_session_id(name: str, email: str) -> str:
    return f"{name.lower().replace(' ', '_')}_{email.lower().split('@')[0]}"


async def run_pipeline(
    product_context: str,
    count: int = 20,
    start_index: int = 0,
    session_id: str = None,
) -> list:
    """
    Full pipeline:
    1. Research competitive landscape (one OpenAI call)
    2. Generate all personas concurrently with competitive context baked in
    3. Store personas in memory for interview feature
    """
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
            # Store each persona for interview access
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
    name: str = Form(...),
    email: str = Form(...),
    text: str = Form(...),
    count: int = Form(20),
    start_index: int = Form(0),
):
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text input is required."})

    session_id = make_session_id(name, email)
    _product_context_store[session_id] = text
    personas = await run_pipeline(text, count=count, start_index=start_index, session_id=session_id)
    return {"personas": personas, "total": len(personas), "session_id": session_id}


@app.post("/generate-from-file")
async def generate_from_file(
    name: str = Form(...),
    email: str = Form(...),
    file: UploadFile = File(...),
    count: int = Form(20),
    start_index: int = Form(0),
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
        return JSONResponse(
            status_code=400,
            content={"error": "Unsupported file type. Please upload a PDF, DOCX, or TXT file."}
        )

    if not text.strip():
        return JSONResponse(
            status_code=400,
            content={"error": "Could not extract any text from this file."}
        )

    session_id = make_session_id(name, email)
    _product_context_store[session_id] = text
    personas = await run_pipeline(text, count=count, start_index=start_index, session_id=session_id)
    return {"personas": personas, "total": len(personas), "session_id": session_id}


@app.post("/generate-from-url")
async def generate_from_url(
    name: str = Form(...),
    email: str = Form(...),
    url: str = Form(...),
    count: int = Form(20),
    start_index: int = Form(0),
):
    try:
        browse_result = await browse_product_url(url)
    except Exception as e:
        return JSONResponse(
            status_code=400,
            content={"error": f"Browser agent failed: {str(e)}"}
        )

    if not browse_result.get("full_text_summary", "").strip():
        return JSONResponse(
            status_code=400,
            content={"error": "No readable content found at that URL."}
        )

    product_context = format_browser_context(browse_result)
    session_id = make_session_id(name, email)
    _product_context_store[session_id] = product_context
    personas = await run_pipeline(product_context, count=count, start_index=start_index, session_id=session_id)

    return {
        "personas": personas,
        "total": len(personas),
        "session_id": session_id,
        "browse_summary": {
            "headlines": browse_result.get("headlines", [])[:5],
            "ctas": browse_result.get("ctas", [])[:5],
            "pricing_found": len(browse_result.get("pricing", [])) > 0,
            "pages": browse_result.get("pages_visited", []),
        },
    }


@app.post("/interview/auto")
async def auto_interview(
    session_id: str = Form(...),
    persona_id: int = Form(...),
):
    """Generate a 5-question auto interview for a specific persona."""
    key = f"{session_id}_{persona_id}"
    persona = _persona_store.get(key)
    product_context = _product_context_store.get(session_id)

    if not persona:
        raise HTTPException(status_code=404, detail="Persona not found. Make sure session_id and persona_id are correct.")
    if not product_context:
        raise HTTPException(status_code=404, detail="Session not found.")

    qa_pairs = await generate_auto_interview(persona, product_context)
    return {
        "persona_id": persona_id,
        "persona_name": persona["name"],
        "qa": qa_pairs,
    }


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)