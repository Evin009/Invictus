from langgraph.graph import StateGraph, END

from src.agents.apply import apply_to_job
from src.agents.cover_letter import generate_cover_letter
from src.agents.outreach import run_outreach
from src.agents.reply_tracker import scan_replies
from src.agents.reporter import generate_report
from src.agents.resume_tailor import tailor_resume
from src.agents.search import search_agent
from src.config import settings
from src.filters.dedup import dedup_filter
from src.filters.preference import preference_filter
from src.notifications.slack import post_error
from src.state import GraphState


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
    tailored = []
    for job in state.get("jobs_filtered", []):
        try:
            resume = tailor_resume(job, settings.base_resume_tex)
            cover = generate_cover_letter(job)
            tailored.append({**job, **resume, **cover})
        except Exception as e:
            post_error("tailor_node", str(e), {"job_url": job.get("job_url", "")})
            continue
    return {"jobs_tailored": tailored}


def apply_node(state: GraphState) -> dict:
    applied = []
    for item in state.get("jobs_tailored", []):
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

    graph.add_node("search", search_agent)
    graph.add_node("filter", filter_node)
    graph.add_node("tailor", tailor_node)
    graph.add_node("apply", apply_node)
    graph.add_node("outreach", outreach_node)
    graph.add_node("reply_track", reply_track_node)
    graph.add_node("report", report_node)

    graph.set_entry_point("search")
    graph.add_edge("search", "filter")
    graph.add_edge("filter", "tailor")
    graph.add_edge("tailor", "apply")
    graph.add_edge("apply", "outreach")
    graph.add_edge("outreach", "reply_track")
    graph.add_edge("reply_track", "report")
    graph.add_edge("report", END)

    return graph.compile()
