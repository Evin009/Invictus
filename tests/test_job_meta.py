from src.agents.job_meta import (
    infer_job_type,
    infer_workplace,
    infer_degree_level,
    infer_visa_sponsorship,
    infer_role_category,
    matches_keywords,
    broad_search_query,
)


# --- infer_job_type ---

def test_infer_job_type_intern():
    assert infer_job_type("Software Engineer Intern") == "Internship"


def test_infer_job_type_contract():
    assert infer_job_type("Backend Contractor") == "Contract"


def test_infer_job_type_part_time():
    assert infer_job_type("Part-time Support Rep") == "Part-time"


def test_infer_job_type_default_full_time():
    assert infer_job_type("Senior Software Engineer") == "Full-time"


# --- infer_workplace ---

def test_infer_workplace_from_explicit_field():
    assert infer_workplace("New York, NY", explicit="remote") == "Remote"


def test_infer_workplace_from_location_text():
    assert infer_workplace("Remote - US") == "Remote"


def test_infer_workplace_hybrid():
    assert infer_workplace("Hybrid - SF") == "Hybrid"


def test_infer_workplace_onsite():
    assert infer_workplace("On-site, Austin TX") == "Onsite"


def test_infer_workplace_none_when_no_signal():
    assert infer_workplace("Austin, TX") is None


def test_infer_workplace_none_when_no_location():
    assert infer_workplace(None) is None


# --- infer_degree_level ---

def test_infer_degree_level_phd():
    assert infer_degree_level("Requires a PhD in Computer Science") == "PhD"


def test_infer_degree_level_masters():
    assert infer_degree_level("Master's degree preferred") == "Master's"


def test_infer_degree_level_bachelors():
    assert infer_degree_level("Bachelor's degree in CS required") == "Bachelor's"


def test_infer_degree_level_prioritizes_most_senior_mention():
    assert infer_degree_level("Bachelor's or PhD accepted") == "PhD"


def test_infer_degree_level_none_when_not_mentioned():
    assert infer_degree_level("Great team, fast-paced environment") is None


def test_infer_degree_level_none_when_empty():
    assert infer_degree_level(None) is None


# --- infer_visa_sponsorship ---

def test_infer_visa_sponsorship_yes():
    assert infer_visa_sponsorship("We will sponsor visas for this role") == "Yes"


def test_infer_visa_sponsorship_no():
    assert infer_visa_sponsorship("We are unable to sponsor visas at this time") == "No"


def test_infer_visa_sponsorship_none_when_not_mentioned():
    assert infer_visa_sponsorship("Great benefits and flexible PTO") is None


def test_infer_visa_sponsorship_none_when_empty():
    assert infer_visa_sponsorship(None) is None


# --- infer_role_category ---

def test_infer_role_category_engineering():
    assert infer_role_category("Software Engineer Intern") == "Engineering"


def test_infer_role_category_data_before_engineering():
    assert infer_role_category("Data Engineer") == "Data"


def test_infer_role_category_design():
    assert infer_role_category("Product Designer") == "Design"


def test_infer_role_category_product():
    assert infer_role_category("Product Manager") == "Product"


def test_infer_role_category_marketing():
    assert infer_role_category("Marketing Coordinator") == "Marketing"


def test_infer_role_category_none_when_unmatched():
    assert infer_role_category("Executive Assistant") is None


# --- matches_keywords ---

def test_matches_keywords_exact_phrase():
    assert matches_keywords("Software Engineering Intern", ["Software Engineering Intern"]) is True


def test_matches_keywords_case_insensitive():
    assert matches_keywords("software engineering intern", ["Software Engineering Intern"]) is True


def test_matches_keywords_broad_role_match_co_op():
    # Real postings often phrase this differently than the exact keyword —
    # "Co-op" instead of "Intern", but same core role words.
    assert matches_keywords("Software Engineer Co-op", ["Software Engineering Intern"]) is True


def test_matches_keywords_broad_role_match_different_word_order():
    assert matches_keywords("Backend Intern, Platform Team", ["Software Engineering Intern"]) is False
    assert matches_keywords("Backend Intern, Platform Team", ["Backend Intern"]) is True


def test_matches_keywords_rejects_non_internship_non_matching_role():
    # Not an internship/co-op posting and doesn't share the exact phrase —
    # should not fall through to a broad match.
    assert matches_keywords("Marketing Manager", ["Software Engineering Intern"]) is False


def test_matches_keywords_rejects_internship_without_shared_role_words():
    # Mentions internship, but shares no core role word with the keyword —
    # broad match should not fire.
    assert matches_keywords("Marketing Intern", ["Software Engineering Intern"]) is False


def test_matches_keywords_no_keywords_matches_everything():
    assert matches_keywords("Anything at all", []) is True


def test_matches_keywords_recognizes_coop_variants():
    assert matches_keywords("Software Engineering Co-op", ["Software Engineer Intern"]) is True
    assert matches_keywords("Software Engineering Coop", ["Software Engineer Intern"]) is True


# --- broad_search_query ---

def test_broad_search_query_strips_intern():
    assert broad_search_query("Software Engineering Intern") == "Software Engineering"


def test_broad_search_query_strips_co_op():
    assert broad_search_query("Software Engineer Co-op") == "Software Engineer"


def test_broad_search_query_leaves_non_internship_keyword_unchanged():
    assert broad_search_query("Data Scientist") == "Data Scientist"


def test_broad_search_query_falls_back_to_original_if_nothing_left():
    assert broad_search_query("Internship") == "Internship"
