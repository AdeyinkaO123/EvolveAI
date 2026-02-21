"""
browser_agent.py
Uses Playwright to simulate real user interactions on a product URL.
Scrolls the full page, visits pricing/features subpages, clicks CTAs.
Returns structured product intelligence for persona generation.
"""

import asyncio
from playwright.async_api import async_playwright


async def browse_product_url(url: str) -> dict:
    """
    Simulate a real user visiting a product URL.
    Returns a dict with all gathered content and context.
    """
    result = {
        "url": url,
        "pages_visited": [],
        "headlines": [],
        "subheadlines": [],
        "ctas": [],
        "pricing": [],
        "testimonials": [],
        "forms_found": [],
        "nav_links": [],
        "full_text_summary": "",
        "errors": [],
    }

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        async def extract_page_content(pg, label: str) -> str:
            """Extract structured content from the current page."""
            await pg.wait_for_load_state("domcontentloaded", timeout=15000)

            # Scroll to trigger lazy-loaded content
            await pg.evaluate("""
                async () => {
                    await new Promise(resolve => {
                        let totalHeight = 0;
                        const distance = 300;
                        const timer = setInterval(() => {
                            window.scrollBy(0, distance);
                            totalHeight += distance;
                            if (totalHeight >= document.body.scrollHeight) {
                                clearInterval(timer);
                                resolve();
                            }
                        }, 80);
                    });
                }
            """)
            await asyncio.sleep(0.5)
            await pg.evaluate("window.scrollTo(0, 0)")

            # Extract structured elements
            data = await pg.evaluate("""
                () => {
                    const getText = (selector) =>
                        [...document.querySelectorAll(selector)]
                            .map(el => el.innerText.trim())
                            .filter(t => t.length > 2 && t.length < 300);

                    const h1s = getText('h1');
                    const h2s = getText('h2');
                    const h3s = getText('h3');
                    const buttons = getText('button, a.btn, a.button, [class*="cta"], [class*="btn"]');
                    const prices = getText('[class*="price"], [class*="pricing"], [class*="plan"]');
                    const testimonials = getText('[class*="testimonial"], [class*="review"], blockquote');
                    const forms = [...document.querySelectorAll('form')].map(f => ({
                        action: f.action,
                        fields: [...f.querySelectorAll('input, textarea, select')]
                            .map(i => i.placeholder || i.name || i.type)
                    }));
                    const bodyText = document.body.innerText.slice(0, 5000);
                    return { h1s, h2s, h3s, buttons, prices, testimonials, forms, bodyText };
                }
            """)

            result["pages_visited"].append(label)
            result["headlines"].extend(data.get("h1s", []))
            result["subheadlines"].extend(data.get("h2s", []) + data.get("h3s", []))
            result["ctas"].extend(data.get("buttons", []))
            result["pricing"].extend(data.get("prices", []))
            result["testimonials"].extend(data.get("testimonials", []))
            result["forms_found"].extend(data.get("forms", []))

            return data.get("bodyText", "")

        # ── Step 1: Visit main URL ─────────────────────────────────────────────
        try:
            await page.goto(url, timeout=20000, wait_until="domcontentloaded")
            main_text = await extract_page_content(page, "homepage")
            result["full_text_summary"] += f"\n\n=== HOMEPAGE ===\n{main_text}"
        except Exception as e:
            result["errors"].append(f"Homepage load error: {str(e)}")
            await browser.close()
            return result

        # ── Step 2: Discover and visit nav links ───────────────────────────────
        nav_links = await page.evaluate("""
            () => {
                const keywords = ['pricing', 'features', 'product', 'about', 'how it works', 'solutions', 'plans'];
                const links = [...document.querySelectorAll('nav a, header a, [class*="nav"] a')];
                return links
                    .map(a => ({ text: a.innerText.trim().toLowerCase(), href: a.href }))
                    .filter(l => l.href && l.href.startsWith('http') && keywords.some(k => l.text.includes(k)))
                    .slice(0, 4);
            }
        """)
        result["nav_links"] = nav_links

        base_domain = url.split("/")[2]
        for link in nav_links:
            if base_domain not in link.get("href", ""):
                continue
            try:
                sub_page = await context.new_page()
                await sub_page.goto(link["href"], timeout=15000, wait_until="domcontentloaded")
                sub_text = await extract_page_content(sub_page, link["text"])
                result["full_text_summary"] += f"\n\n=== {link['text'].upper()} PAGE ===\n{sub_text[:2000]}"
                await sub_page.close()
                await asyncio.sleep(0.3)
            except Exception as e:
                result["errors"].append(f"Subpage '{link['text']}' error: {str(e)}")

        # ── Step 3: Try clicking a signup/demo CTA ─────────────────────────────
        try:
            cta_selectors = [
                'a:has-text("Sign up")', 'a:has-text("Get started")',
                'a:has-text("Try free")', 'button:has-text("Get started")',
                'a:has-text("Request demo")', 'a:has-text("Start free")',
            ]
            for sel in cta_selectors:
                try:
                    btn = await page.query_selector(sel)
                    if btn:
                        href = await btn.get_attribute("href")
                        if href and base_domain in href:
                            signup_page = await context.new_page()
                            await signup_page.goto(href, timeout=10000)
                            signup_text = await extract_page_content(signup_page, "signup/onboarding")
                            result["full_text_summary"] += f"\n\n=== SIGNUP/ONBOARDING ===\n{signup_text[:1500]}"
                            await signup_page.close()
                        break
                except Exception:
                    continue
        except Exception as e:
            result["errors"].append(f"CTA interaction error: {str(e)}")

        await browser.close()

    # Deduplicate
    result["headlines"] = list(dict.fromkeys(result["headlines"]))[:10]
    result["subheadlines"] = list(dict.fromkeys(result["subheadlines"]))[:20]
    result["ctas"] = list(dict.fromkeys(result["ctas"]))[:15]
    result["pricing"] = list(dict.fromkeys(result["pricing"]))[:10]

    return result


def format_browser_context(browse_result: dict) -> str:
    """Format the browser result into rich text context for the LLM."""
    lines = [f"PRODUCT URL: {browse_result['url']}"]
    lines.append(f"Pages visited: {', '.join(browse_result['pages_visited'])}")

    if browse_result["headlines"]:
        lines.append("\nMAIN HEADLINES:\n" + "\n".join(f"  • {h}" for h in browse_result["headlines"]))
    if browse_result["subheadlines"]:
        lines.append("\nSUB-HEADLINES:\n" + "\n".join(f"  • {h}" for h in browse_result["subheadlines"][:10]))
    if browse_result["ctas"]:
        lines.append("\nCALL-TO-ACTIONS:\n" + "\n".join(f"  • {c}" for c in browse_result["ctas"][:8]))
    if browse_result["pricing"]:
        lines.append("\nPRICING INFO:\n" + "\n".join(f"  • {p}" for p in browse_result["pricing"][:6]))
    if browse_result["forms_found"]:
        lines.append(f"\nFORMS FOUND: {len(browse_result['forms_found'])} form(s) on the site")
    if browse_result["testimonials"]:
        lines.append("\nEXISTING TESTIMONIALS:\n" + "\n".join(f"  • {t[:150]}" for t in browse_result["testimonials"][:3]))
    if browse_result["full_text_summary"]:
        lines.append(f"\nFULL PAGE CONTENT:\n{browse_result['full_text_summary'][:4000]}")
    if browse_result["errors"]:
        lines.append(f"\n[Browse errors: {'; '.join(browse_result['errors'])}]")

    return "\n".join(lines)