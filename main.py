import os
import asyncio
import random
import json
import io
from fastapi import FastAPI, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from openai import AsyncOpenAI
import PyPDF2
import docx

load_dotenv()

app = FastAPI(title="Evolve AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

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


# ─── File extraction helpers ───────────────────────────────────────────────────

def extract_text_from_pdf(file_bytes: bytes) -> str:
    reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def extract_text_from_docx(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs)


# ─── Core persona generation ───────────────────────────────────────────────────

async def generate_single_persona(
    persona_name: str,
    segment: str,
    tone: str,
    color: str,
    product_context: str,
    persona_index: int,
) -> dict:
    system_prompt = f"""You are {persona_name}, a {segment} who is {tone}.
You are giving honest, realistic feedback about a product you just evaluated.
Your feedback should feel human — include specific observations, a mix of praise and critique,
and reflect your persona mindset. Write in first person, 2-4 sentences.
Do NOT use generic phrases like "overall great product". Be specific to what you read.
Vary your sentiment naturally — not every persona loves the product."""

    user_prompt = f"""Here is the product information you reviewed:

---
{product_context[:3000]}
---

Give your honest feedback and star rating (1-5). Respond in this exact JSON format:
{{
  "feedback": "your feedback here",
  "rating": <number 1-5>,
  "sentiment": "<Positive|Constructive|Neutral|Enthusiastic|Critical>"
}}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.9,
        max_tokens=200,
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)

    return {
        "id": persona_index,
        "name": persona_name,
        "color": color,
        "segment": segment,
        "feedback": data.get("feedback", "No feedback generated."),
        "rating": max(1, min(5, int(data.get("rating", 3)))),
        "sentiment": data.get("sentiment", "Neutral"),
    }


async def generate_personas_batch(
    product_context: str,
    count: int = 20,
    start_index: int = 0,
) -> list:
    names = random.sample(PERSONA_NAMES, min(count, len(PERSONA_NAMES)))
    if count > len(names):
        names += random.choices(PERSONA_NAMES, k=count - len(names))

    segments = random.choices(SEGMENTS, k=count)
    tones = random.choices(TONES, k=count)
    colors = [AVATAR_COLORS[(start_index + i) % len(AVATAR_COLORS)] for i in range(count)]

    tasks = [
        generate_single_persona(
            persona_name=names[i],
            segment=segments[i],
            tone=tones[i],
            color=colors[i],
            product_context=product_context,
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
    """Generate personas from plain text input."""
    if not text.strip():
        return JSONResponse(status_code=400, content={"error": "Text input is required."})

    personas = await generate_personas_batch(text, count=count, start_index=start_index)
    return {"personas": personas, "total": len(personas)}


@app.post("/generate-from-file")
async def generate_from_file(
    name: str = Form(...),
    email: str = Form(...),
    file: UploadFile = File(...),
    count: int = Form(20),
    start_index: int = Form(0),
):
    """Generate personas from an uploaded file (PDF, DOCX, TXT)."""
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

    personas = await generate_personas_batch(text, count=count, start_index=start_index)
    return {"personas": personas, "total": len(personas)}


# ─── Run ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)