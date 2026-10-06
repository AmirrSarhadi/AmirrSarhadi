from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .serializers import TransferCreateSerializer, TransferReadSerializer


class TransferCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = TransferCreateSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        transfer = serializer.save()

        return Response(
            TransferReadSerializer(transfer).data,
            status=status.HTTP_201_CREATED,
        )
