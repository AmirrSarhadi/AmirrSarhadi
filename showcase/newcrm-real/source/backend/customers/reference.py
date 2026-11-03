from django.db.models import Count, Exists, F, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from .access import visible_records
from .models import Person, Company, PersonCompany


def reference_records(queryset, member):
    if queryset.model is not Person:
        return queryset
    from activities.services import activities
    tasks = activities(member).annotate(root_customer=Coalesce("person_id", "opportunity__person_id", "lead__converted_person_id")).filter(root_customer=OuterRef("pk")).order_by().values("root_customer").annotate(n=Count("pk")).values("n")
    companies = visible_records(Company, member)
    links = PersonCompany.objects.filter(organization=member.organization, person_id=OuterRef("pk"), company_id__in=companies.values("pk")).order_by("created_at", "id")
    return queryset.select_related("primary_company", "created_by").annotate(
        activity_count=Coalesce(Subquery(tasks), Value(0)),
        reference_primary_id=F("primary_company_id"),
        primary_visible=Exists(companies.filter(pk=OuterRef("primary_company_id"))),
        linked_company_label=Subquery(links.values("company__name")[:1]),
        linked_company_id=Subquery(links.values("company_id")[:1]),
    )
