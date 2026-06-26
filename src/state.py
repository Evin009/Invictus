from typing import TypedDict


class JobItem(TypedDict):
    job_url: str
    job_id: str
    title: str
    company: str
    source: str
    description: str
    ats_platform: str
    raw_json: dict


class GraphState(TypedDict):
    run_id: str
    jobs_discovered: list[JobItem]    # after search / watchlist / crawler
    jobs_filtered: list[JobItem]      # after preference filter + dedup
    jobs_tailored: list[dict]         # after resume tailor: includes resume_pdf_path
    jobs_applied: list[dict]          # after apply: includes confirmation
    jobs_outreached: list[dict]       # after outreach
    errors: list[dict]                # {agent, error, context} per failure
    summary: dict                     # populated by reporter at end of run
