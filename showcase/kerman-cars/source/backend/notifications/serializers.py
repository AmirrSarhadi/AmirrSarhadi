from rest_framework import serializers

from notifications.models import Notification


class NotificationSerializer(
    serializers.ModelSerializer
):
    is_read = serializers.BooleanField(
        read_only=True,
    )

    class Meta:
        model = Notification
        fields = (
            "id",
            "kind",
            "title",
            "message",
            "data",
            "is_read",
            "read_at",
            "created_at",
        )
        read_only_fields = fields

class NotificationUnreadCountSerializer(
    serializers.Serializer
):
    unread_count = serializers.IntegerField(
        read_only=True,
    )


class NotificationMarkReadResponseSerializer(
    serializers.Serializer
):
    detail = serializers.CharField(
        read_only=True,
    )
    notification = NotificationSerializer(
        read_only=True,
    )


class NotificationMarkAllReadResponseSerializer(
    serializers.Serializer
):
    detail = serializers.CharField(
        read_only=True,
    )
    updated_count = serializers.IntegerField(
        read_only=True,
    )