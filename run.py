import uuid

from src.graph import build_graph
from src.state import GraphState


def main() -> None:
    graph = build_graph()
    initial: GraphState = {
        "run_id": str(uuid.uuid4()),
        "jobs_discovered": [],
        "jobs_filtered": [],
        "jobs_tailored": [],
        "jobs_applied": [],
        "jobs_outreached": [],
        "errors": [],
        "summary": {},
    }
    result = graph.invoke(initial)
    summary = result.get("summary", {})
    print(f"Run complete. Jobs discovered: {summary.get('jobs_discovered', 0)}, Applied: {summary.get('applied', 0)}")


if __name__ == "__main__":
    main()
