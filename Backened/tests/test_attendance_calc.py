"""Regression tests for cumulative attendance percentage + 75% eligibility.

These replicate the exact server-side logic in /api/student/dashboard so the
calculation source is locked down:
  percentage = (present_periods / conducted_periods) * 100   (Present + OD = present)
  eligibility uses the RAW (unrounded) percentage >= 75.0
  display uses round(raw, 2)
"""


def compute(records):
    total = len(records)
    present = sum(1 for r in records if r in ("Present", "OD"))
    raw = (present / total) * 100 if total > 0 else 0.0
    return {
        "total": total,
        "present": present,
        "percentage": round(raw, 2),
        "is_eligible": raw >= 75.0,
    }


def test_example_108_of_121():
    records = ["Present"] * 108 + ["Absent"] * 13  # 121 conducted
    r = compute(records)
    assert r["total"] == 121
    assert r["present"] == 108
    assert r["percentage"] == 89.26
    assert r["is_eligible"] is True


def test_od_counts_as_present():
    records = ["Present", "OD", "OD", "Absent"]  # 3/4
    r = compute(records)
    assert r["present"] == 3
    assert r["percentage"] == 75.0
    assert r["is_eligible"] is True


def test_exactly_75_is_eligible():
    records = ["Present"] * 3 + ["Absent"]  # 75.00
    r = compute(records)
    assert r["percentage"] == 75.0
    assert r["is_eligible"] is True


def test_just_below_75_is_shortage():
    # 1499 present out of 2000 = 74.95% -> Shortage (raw value, no rounding up)
    records = ["Present"] * 1499 + ["Absent"] * 501
    r = compute(records)
    assert r["percentage"] == 74.95
    assert r["is_eligible"] is False


def test_no_records_is_zero():
    r = compute([])
    assert r["total"] == 0
    assert r["percentage"] == 0.0
    assert r["is_eligible"] is False


def test_all_absent_is_zero_shortage():
    r = compute(["Absent", "Absent"])
    assert r["percentage"] == 0.0
    assert r["is_eligible"] is False
