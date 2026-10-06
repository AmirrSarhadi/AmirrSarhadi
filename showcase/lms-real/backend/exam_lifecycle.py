"""Sanitized exam lifecycle sample derived from a private LMS."""

from decimal import Decimal

from django.db import transaction
from django.utils import timezone


class VersionConflict(Exception):
    pass


@transaction.atomic
def submit_attempt(*, attempt, expected_version: int, questions, answers_by_question):
    if attempt.status != "active":
        raise ValueError("attempt already finalized")

    if attempt.version != expected_version:
        raise VersionConflict("stale exam attempt")

    total = Decimal("0")
    has_manual_grading = False

    for question in questions:
        answer = answers_by_question[question.id]

        if question.kind == "single":
            if answer.selected_option is None:
                answer.awarded_points = Decimal("0")
            elif answer.selected_option == question.correct_option:
                answer.awarded_points = question.points
            else:
                answer.awarded_points = -question.negative_points
            total += answer.awarded_points
        elif answer.text.strip():
            answer.awarded_points = None
            has_manual_grading = True
        else:
            answer.awarded_points = Decimal("0")

        answer.save(update_fields=["awarded_points", "saved_at"])

    attempt.submitted_at = timezone.now()
    attempt.status = "submitted" if has_manual_grading else "graded"
    attempt.score = None if has_manual_grading else total
    attempt.version += 1
    attempt.save(update_fields=["submitted_at", "status", "score", "version"])
    return attempt


@transaction.atomic
def publish_results(*, exam, expected_version: int, all_attempts_graded: bool, policy: str):
    if exam.version != expected_version:
        raise VersionConflict("stale exam state")
    if timezone.now() < exam.ends_at:
        raise ValueError("exam is still active")
    if not all_attempts_graded:
        raise ValueError("grading is incomplete")

    exam.results_published = True
    exam.result_policy = policy
    exam.version += 1
    exam.save(update_fields=["results_published", "result_policy", "version"])
    return exam
