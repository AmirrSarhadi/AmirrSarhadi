from rest_framework import serializers


def get_page_size(request, default=20):
    return serializers.IntegerField(min_value=1,max_value=100).run_validation(request.query_params.get("page_size",default))
