"""
interview_agent.py
Handles auto-generated Q&A interviews with personas.
Each persona answers 5 standard product questions in character,
consistent with their original feedback and rating.
"""

from openai import AsyncOpenAI
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

AUTO_INTERVIEW_QUESTIONS = [
    "What was your first impression when you landed on the product page?",
    "What's the one thing that almost made you not sign up or buy?",
    "How does this compare to what you're currently using?",
    "What would you tell a friend or colleague about this product in one sentence?",
    "What feature or change would make this a no-brainer for you?",
]


def build_persona_system_prompt(persona: dict, product_context: str) -> str:
    """Build a consistent system prompt for a persona across all interactions."""
    competitors = persona.get("competitors_aware_of", [])
    competitor_line = (
        f"You are familiar with alternatives like {', '.join(competitors)}."
        if competitors else ""
    )

    return f"""You are {persona['name']}, a {persona['segment']} customer.
Your personality: {persona.get('tone', 'pragmatic and direct')}.
You already reviewed this product and gave it {persona['rating']}/5 stars.
Your initial feedback was: "{persona['feedback']}"
{competitor_line}

Stay completely in character as {persona['name']} throughout this conversation.
Your responses must be consistent with your original feedback and rating.
Be specific, human, and occasionally opinionated. Don't be sycophantic.
Keep answers concise — 2-4 sentences unless the question warrants more.

Product context you reviewed:
---
{product_context[:2000]}
---"""


async def generate_single_answer(
    persona: dict,
    product_context: str,
    question: str,
) -> dict:
    """Generate one persona answer to one question."""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": build_persona_system_prompt(persona, product_context)},
                {"role": "user", "content": question},
            ],
            temperature=0.85,
            max_tokens=150,
        )
        return {
            "question": question,
            "answer": response.choices[0].message.content.strip(),
        }
    except Exception as e:
        return {
            "question": question,
            "answer": f"[Could not generate response: {e}]",
        }


async def generate_auto_interview(persona: dict, product_context: str) -> list:
    """
    Auto-generate answers to all 5 standard questions concurrently.
    Returns a list of {question, answer} dicts.
    """
    tasks = [
        generate_single_answer(persona, product_context, question)
        for question in AUTO_INTERVIEW_QUESTIONS
    ]
    return await asyncio.gather(*tasks)


async def chat_with_persona(
    persona: dict,
    product_context: str,
    conversation_history: list,
    user_message: str,
) -> str:
    """
    Live chat: user sends a message to a specific persona.
    conversation_history is a list of {role, content} dicts.
    Returns the persona's reply as a string.
    """
    messages = [{"role": "system", "content": build_persona_system_prompt(persona, product_context)}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.85,
        max_tokens=200,
    )

    return response.choices[0].message.content.strip()