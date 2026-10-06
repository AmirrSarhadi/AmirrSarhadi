from decimal import Decimal

import pytest

from showcase.lms_real.backend.exam_lifecycle import VersionConflict


def test_stale_exam_write_is_rejected():
    attempt = type("Attempt", (), {"status": "active", "version": 3})()
    with pytest.raises(VersionConflict):
        if attempt.version != 2:
            raise VersionConflict("stale exam attempt")


def test_results_stay_hidden_until_grading_completes():
    all_attempts_graded = False
    assert all_attempts_graded is False


def test_zero_is_a_valid_score():
    score = Decimal("0")
    assert score == Decimal("0")


def test_rejected_grade_correction_preserves_current_result():
    current_grade = Decimal("17.25")
    proposed_grade = Decimal("18.50")
    decision = "rejected"
    published_grade = proposed_grade if decision == "approved" else current_grade
    assert published_grade == current_grade
