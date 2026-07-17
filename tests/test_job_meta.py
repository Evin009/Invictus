from src.agents.job_meta import (
    infer_job_type,
    infer_workplace,
    infer_degree_level,
    infer_visa_sponsorship,
    infer_role_category,
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
