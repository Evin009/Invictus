from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from langgraph.graph import StateGraph, END

from src.agents.apply import apply_to_job, count_applications_today, fetch_agent_settings
from src.agents.cover_letter import generate_cover_letter
from src.agents.crawler import crawler_agent
from src.agents.outreach import run_outreach
from src.agents.reply_tracker import scan_replies
from src.agents.reporter import generate_report
from src.agents.resume_tailor import fetch_base_resume_tex, tailor_resume
from src.agents.search import search_agent
from src.agents.watchlist import watchlist_agent
from src.filters.dedup import dedup_filter
from src.filters.preference import preference_filter
from src.notifications.slack import post_error
from src.state import GraphState, JobItem

SEARCH_SCAN_INTERVAL_HOURS = 2
CRAWLER_SCAN_INTERVAL_HOURS = 4


def _should_run_scan(column: str, interval_hours: float) -> bool:
    """Generic gate for a lower-priority discovery tier tracked by its own
    agent_settings timestamp column. Defaults to running when there's no
    record yet (first run)."""
    from src.db.client import get_client

    db = get_client()
    rows = db.table("agent_settings").select(column).limit(1).execute().data or []
    if not rows or not rows[0].get(column):
        return True
    last = datetime.fromisoformat(rows[0][column].replace("Z", "+00:00"))
    elapsed_hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600
    return elapsed_hours >= interval_hours


def _mark_scan_run(column: str) -> None:
    from src.db.client import get_client

    db = get_client()
    existing = db.table("agent_settings").select("id").limit(1).execute().data or []
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        db.table("agent_settings").update({column: now}).eq("id", existing[0]["id"]).execute()
    else:
        db.table("agent_settings").insert({column: now}).execute()


def _should_run_search_scan() -> bool:
    """search_agent hits Greenhouse/Lever/GitHub structured APIs — cheap,
    no Playwright — so it's gated to a shorter interval than crawler_agent."""
    return _should_run_scan("last_search_scan_at", SEARCH_SCAN_INTERVAL_HOURS)


def _should_run_crawler_scan() -> bool:
    """crawler_agent does real Playwright page scrapes against crawler_urls —
    more expensive, so it keeps the longer interval."""
    return _should_run_scan("last_crawler_scan_at", CRAWLER_SCAN_INTERVAL_HOURS)


def _dedupe_by_url(jobs: list[JobItem]) -> list[JobItem]:
    seen: set[str] = set()
    deduped: list[JobItem] = []
    for job in jobs:
        url = job.get("job_url")
        if url in seen:
            continue
        seen.add(url)
        deduped.append(job)
    return deduped


def discovery_node(state: GraphState) -> dict:
    """Three-tier discovery: watchlist_agent (top-priority companies) runs
    every invocation; search_agent (Greenhouse/Lever/GitHub — cheap structured
    APIs) is gated to roughly every 2 hours; crawler_agent (arbitrary page
    scrapes) is gated separately to roughly every 4 hours. The two lower tiers
    run in parallel when both happen to be due in the same cycle."""
    empty_state: GraphState = {**state, "jobs_discovered": []}

    watchlist_jobs: list[JobItem] = []
    try:
        watchlist_jobs = watchlist_agent(empty_state).get("jobs_discovered", [])
    except Exception as e:
        post_error("discovery_node", str(e), {"step": "watchlist_agent"})

    run_search = False
    try:
        run_search = _should_run_search_scan()
    except Exception as e:
        post_error("discovery_node", str(e), {"step": "check_search_scan_due"})

    run_crawler = False
    try:
        run_crawler = _should_run_crawler_scan()
    except Exception as e:
        post_error("discovery_node", str(e), {"step": "check_crawler_scan_due"})

    broad_jobs: list[JobItem] = []
    with ThreadPoolExecutor(max_workers=2) as pool:
        search_future = pool.submit(search_agent, empty_state) if run_search else None
        crawler_future = pool.submit(crawler_agent, empty_state) if run_crawler else None

        if search_future is not None:
            try:
                broad_jobs += search_future.result().get("jobs_discovered", [])
            except Exception as e:
                post_error("discovery_node", str(e), {"step": "search_agent"})
            try:
                _mark_scan_run("last_search_scan_at")
            except Exception as e:
                post_error("discovery_node", str(e), {"step": "mark_search_scan_run"})

        if crawler_future is not None:
            try:
                broad_jobs += crawler_future.result().get("jobs_discovered", [])
            except Exception as e:
                post_error("discovery_node", str(e), {"step": "crawler_agent"})
            try:
                _mark_scan_run("last_crawler_scan_at")
            except Exception as e:
                post_error("discovery_node", str(e), {"step": "mark_crawler_scan_run"})

    return {"jobs_discovered": _dedupe_by_url(watchlist_jobs + broad_jobs)}


def filter_node(state: GraphState) -> dict:
    from src.db.client import get_client
    try:
        db = get_client()
        prefs_rows = db.table("preferences").select("*").limit(1).execute().data or []
        prefs = prefs_rows[0] if prefs_rows else {}
    except Exception as e:
        post_error("filter_node", str(e), {})
        prefs = {}

    discovered = state.get("jobs_discovered", [])
    passing = preference_filter(discovered, prefs)
    deduped = dedup_filter(passing)
    return {"jobs_filtered": deduped}


def tailor_node(state: GraphState) -> dict:
    try:
        base_tex_content = fetch_base_resume_tex()
    except Exception as e:
        post_error("tailor_node", str(e), {"step": "fetch_base_resume_tex"})
        return {"jobs_tailored": []}

    tailored = []
    for job in state.get("jobs_filtered", []):
        try:
            resume = tailor_resume(job, base_tex_content)
            cover = generate_cover_letter(job)
            tailored.append({**job, **resume, **cover})
        except Exception as e:
            post_error("tailor_node", str(e), {"job_url": job.get("job_url", "")})
            continue
    return {"jobs_tailored": tailored}


def apply_node(state: GraphState) -> dict:
    try:
        agent_settings = fetch_agent_settings()
    except Exception as e:
        post_error("apply_node", str(e), {"step": "fetch_agent_settings"})
        agent_settings = {"paused": False, "daily_cap": None}

    if agent_settings.get("paused"):
        return {"jobs_applied": []}

    daily_cap = agent_settings.get("daily_cap")
    applied_today = count_applications_today() if daily_cap else 0

    applied = []
    for item in state.get("jobs_tailored", []):
        if daily_cap and applied_today >= daily_cap:
            break
        try:
            receipt = apply_to_job(
                item,
                item.get("resume_pdf_path", ""),
                item.get("cover_letter_path", ""),
            )
            merged = {**item, **receipt}
            if item.get("resume_pdf_path") and not receipt.get("resume_pdf_path"):
                merged["resume_pdf_path"] = item["resume_pdf_path"]
            if item.get("cover_letter_path") and not receipt.get("cover_letter_path"):
                merged["cover_letter_path"] = item["cover_letter_path"]
            applied.append(merged)
            applied_today += 1
        except Exception as e:
            post_error("apply_node", str(e), {"job_url": item.get("job_url", "")})
            continue
    return {"jobs_applied": applied}


def outreach_node(state: GraphState) -> dict:
    outreached = []
    for item in state.get("jobs_applied", []):
        try:
            result = run_outreach(item)
            outreached.append({**item, **result})
        except Exception as e:
            post_error("outreach_node", str(e), {"job_url": item.get("job_url", "")})
            continue
    return {"jobs_outreached": outreached}


def reply_track_node(state: GraphState) -> dict:
    try:
        scan_replies()
    except Exception as e:
        post_error("reply_track_node", str(e), {})
    return {}


def report_node(state: GraphState) -> dict:
    try:
        summary = generate_report()
    except Exception as e:
        post_error("report_node", str(e), {})
        summary = {}
    return {"summary": summary}


def build_graph() -> StateGraph:
    graph = StateGraph(GraphState)

    graph.add_node("discovery", discovery_node)
    graph.add_node("filter", filter_node)
    graph.add_node("tailor", tailor_node)
    graph.add_node("apply", apply_node)
    graph.add_node("outreach", outreach_node)
    graph.add_node("reply_track", reply_track_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("discovery")
    graph.add_edge("discovery", "filter")
    graph.add_edge("filter", "tailor")
    graph.add_edge("tailor", "apply")
    graph.add_edge("apply", "outreach")
    graph.add_edge("outreach", "reply_track")
    graph.add_edge("reply_track", "report")
    graph.add_edge("report", END)

    return graph.compile()
