"""
research_agent.py
Makes one OpenAI call to research the competitive landscape for a product.
Returns segment-tailored competitive context that enriches persona feedback.
"""

import json
from openai import AsyncOpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SEGMENT_RESEARCH_ANGLES = {
    "Early Adopter": "cutting-edge tools and new entrants in this space",
    "Enterprise User": "enterprise-grade solutions, compliance, and scalability concerns",
    "SMB Owner": "affordable SMB-friendly alternatives and value-for-money options",
    "Power User": "feature depth, API access, and advanced customization options",
    "Casual User": "simple consumer-friendly tools in this category",
    "Tech Skeptic": "traditional non-software approaches and low-tech alternatives",
    "Decision Maker": "vendor reputation, ROI studies, and analyst coverage",
    "Startup Founder": "lean startup tools, free tiers, and growth-stage solutions",
    "Freelancer": "freelancer-friendly pricing and solo-use tools",
    "Product Manager": "product analytics and feedback tools used by product teams",
}


async def research_competitive_landscape(product_context: str, segments: list) -> dict:
    """
    Research the competitive landscape for a product.
    Returns competitor names, differentiators, weaknesses, and
    segment-specific context for richer persona feedback.
    """

    unique_segments = list(set(segments))[:5]
    segment_angles = [
        f"- {seg}: focus on {SEGMENT_RESEARCH_ANGLES.get(seg, 'relevant alternatives')}"
        for seg in unique_segments
    ]

    prompt = f"""You are a market research analyst. Based on this product description, identify:
1. The product category and what it does
2. 3-5 real competitor products or alternatives a customer might compare it to
3. Key differentiators and weaknesses vs those competitors
4. For each customer segment below, what specific comparison points or concerns would they have:
{chr(10).join(segment_angles)}

Product description:
---
{product_context[:2500]}
---

Respond in this exact JSON format:
{{
  "product_category": "...",
  "competitors": ["competitor1", "competitor2", "competitor3"],
  "key_differentiators": ["differentiator1", "differentiator2"],
  "key_weaknesses": ["weakness1", "weakness2"],
  "segment_context": {{
    "SegmentName": "1-2 sentences of what this segment would specifically compare or worry about"
  }}
}}"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800,
            response_format={"type": "json_object"},
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"Research agent error: {e}")
        # Return empty structure so persona generation still works
        return {
            "product_category": "unknown",
            "competitors": [],
            "key_differentiators": [],
            "key_weaknesses": [],
            "segment_context": {},
        }


async def generate_persona_with_research(
    persona_name: str,
    segment: str,
    tone: str,
    color: str,
    product_context: str,
    competitive_intel: dict,
    persona_index: int,
) -> dict:
    """
    Generate one persona's feedback enriched with competitive research context.
    Each persona is aware of real alternatives and compares accordingly.
    """

    segment_context = competitive_intel.get("segment_context", {}).get(segment, "")
    competitors = ", ".join(competitive_intel.get("competitors", [])[:3]) or "similar tools"
    category = competitive_intel.get("product_category", "this type of product")

    system_prompt = f"""You are {persona_name}, a {segment} who is {tone}.
You have evaluated this product as part of researching options in the {category} space.
You are aware of alternatives like {competitors}.
{f'As a {segment}, you specifically care about: {segment_context}' if segment_context else ''}

Give honest, specific, realistic feedback. Reference real concerns a person like you would have.
Vary your sentiment realistically — aim for a natural distribution: roughly 40% positive or enthusiastic,
35% constructive or mixed, and 25% critical or skeptical. Not every persona should be negative.
Write in first person, 2-4 sentences. Avoid generic phrases."""

    user_prompt = f"""Product information you reviewed:
---
{product_context[:3000]}
---

Competitive context you are aware of:
- Category: {category}
- Alternatives you know: {competitors}
- Key differentiators claimed: {', '.join(competitive_intel.get('key_differentiators', [])[:3])}

Give your feedback and rating. Respond in this exact JSON format:
{{
  "feedback": "your feedback here (specific, human, grounded in your persona)",
  "rating": <number 1-5>,
  "sentiment": "<Positive|Constructive|Neutral|Enthusiastic|Critical>",
  "comparison_note": "one short sentence comparing to alternatives you know, or empty string"
}}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.9,
        max_tokens=250,
        response_format={"type": "json_object"},
    )

    data = json.loads(response.choices[0].message.content)

    feedback = data.get("feedback", "")
    comparison = data.get("comparison_note", "")
    full_feedback = f"{feedback} {comparison}".strip() if comparison else feedback

    return {
        "id": persona_index,
        "name": persona_name,
        "color": color,
        "segment": segment,
        "tone": tone,
        "feedback": full_feedback,
        "rating": max(1, min(5, int(data.get("rating", 3)))),
        "sentiment": data.get("sentiment", "Neutral"),
        "competitors_aware_of": competitive_intel.get("competitors", [])[:2],
    }