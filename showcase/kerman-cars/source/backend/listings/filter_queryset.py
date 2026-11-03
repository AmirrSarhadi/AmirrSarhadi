from django.db.models import Q

def apply_listing_filters(queryset, filters):
    direct_filters = {
        "brand": "brand_id",
        "car_model": "car_model_id",
        "trim": "trim_id",
        "city": "city_id",
        "neighborhood": "neighborhood_id",
        "body_type": "car_model__body_type",
        "fuel_type": "trim__fuel_type",
        "transmission": "trim__transmission",
        "min_price": "price__gte",
        "max_price": "price__lte",
        "min_year": "production_year__gte",
        "max_year": "production_year__lte",
        "min_mileage": "mileage__gte",
        "max_mileage": "mileage__lte",
        "body_status": "body_status",
        "price_type": "price_type",
        "is_installment": "is_installment",
        "is_exchangeable": "is_exchangeable",
    }
    requested_featured = filters.get("is_featured")

    if requested_featured is not None:
        queryset = queryset.filter(
            effective_is_featured=requested_featured,
        )

    for parameter, lookup in direct_filters.items():
        value = filters.get(parameter)

        if value is not None:
            queryset = queryset.filter(
                **{lookup: value}
            )

    color = filters.get("color")

    if color:
        queryset = queryset.filter(
            color__iexact=color,
        )

    seller_type = filters.get("seller_type")

    if seller_type == "personal":
        queryset = queryset.filter(
            owner__role="PERSONAL",
        )
    elif seller_type == "dealer":
        queryset = queryset.filter(
            owner__role="DEALER",
        )

    search = filters.get("search")

    if search:
        queryset = queryset.filter(
            Q(title__icontains=search)
            | Q(description__icontains=search)
            | Q(public_code__icontains=search)
            | Q(brand__name__icontains=search)
            | Q(car_model__name__icontains=search)
            | Q(trim__name__icontains=search)
            | Q(city__name__icontains=search)
            | Q(neighborhood__name__icontains=search)
        )

    return queryset
