from rest_framework import serializers
from Persons.models import *
from rest_framework.exceptions import ValidationError
from django.db import transaction
from Persons.validators import (
    validate_person_reference,
    validate_receiver_reference,
)

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seller
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


class StaffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Staff
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
        }


class ShareHolderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ShareHolder
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


class ChequeSerializer(serializers.ModelSerializer):
    cheque_number = serializers.CharField(source="number", read_only=True)
    due_date = serializers.DateField(source="date", read_only=True)
    payer_name = serializers.SerializerMethodField()
    cheque_type_label = serializers.CharField(source="get_cheque_type_display", read_only=True)
    spent_to_name = serializers.SerializerMethodField()
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    settlement_bank_name = serializers.CharField(source="settlement_bank.name", read_only=True)

    class Meta:
        model = Cheque
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_document': {'read_only': True},
            'settlement_document': {'read_only': True},
            'reverse_document': {'read_only': True},
            'status': {'read_only': True},
            'settlement_bank': {'read_only': True},
            'settled_date': {'read_only': True},
            'spent_to_content_type': {'read_only': True},
            'spent_to_object_id': {'read_only': True},
            'spent_at': {'read_only': True},
            'source_app': {'read_only': True},
            'source_model': {'read_only': True},
            'source_id': {'read_only': True},
        }

    def get_payer_name(self, obj):
        return obj.payer_name or "-"
    
    def get_spent_to_name(self, obj):
        person = getattr(obj, "spent_to", None)

        if not person:
            return None

        return (
            getattr(person, "name", None)
            or getattr(person, "full_name", None)
            or getattr(person, "title", None)
            or str(person)
        )
    

    def _closed_statuses(self):
        return [
            getattr(Cheque.ChequeStatus, "CLEARED", "CLEARED"),
            getattr(Cheque.ChequeStatus, "SPENT", "SPENT"),
            getattr(Cheque.ChequeStatus, "RETURNED", "RETURNED"),
            getattr(Cheque.ChequeStatus, "CANCELED", "CANCELED"),
            "CLEARED",
            "SPENT",
            "RETURNED",
            "CANCELED",
        ]


    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        if instance and instance.status in self._closed_statuses():
            raise serializers.ValidationError(
                "این چک به دلیل وضعیت فعلی قابل ویرایش نیست."
            )

        sayad_number = attrs.get(
            "sayad_number",
            getattr(instance, "sayad_number", None) if instance else None,
        )

        number = attrs.get(
            "number",
            getattr(instance, "number", None) if instance else None,
        )

        bank_name = attrs.get(
            "bank_name",
            getattr(instance, "bank_name", None) if instance else None,
        )

        cheque_type = attrs.get(
            "cheque_type",
            getattr(instance, "cheque_type", None) if instance else None,
        )

        duplicate_qs = Cheque.objects.filter(is_deleted=0)

        if instance:
            duplicate_qs = duplicate_qs.exclude(id=instance.id)

        if sayad_number:
            if duplicate_qs.filter(sayad_number=sayad_number).exists():
                raise serializers.ValidationError({
                    "sayad_number": "شماره صیاد تکراری است."
                })

        if number and bank_name and cheque_type:
            if duplicate_qs.filter(
                number=number,
                bank_name=bank_name,
                cheque_type=cheque_type,
            ).exists():
                raise serializers.ValidationError({
                    "number": "شماره چک برای این بانک و نوع چک قبلاً ثبت شده است."
                })

        return attrs


class DriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = Drivers
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'accounting_detail': {'read_only': True},
        }


def is_cheque_type(value):
    return str(value or "").strip().lower() in [
        "cheque",
        "check",
        "چک",
    ]

class GetPaidItemSerializer(serializers.ModelSerializer):
    receiver_id = serializers.IntegerField(required=False, allow_null=True)
    cheque_data = serializers.DictField(write_only=True, required=False)

    receiver_name = serializers.SerializerMethodField()
    cheque_number = serializers.SerializerMethodField()
    cheque_status = serializers.SerializerMethodField()

    class Meta:
        model = GetPaidItem
        exclude = ['is_deleted']
        read_only_fields = [
            'getpaid',
            'getpaid_person_ct',
            'getpaid_person_object_id',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]

    def get_receiver_name(self, obj):
        if obj.receiver_type == "cheque":
            cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
            if not cheque:
                return None
            return cheque.number or cheque.sayad_number or f"چک #{cheque.id}"

        return None

    def get_cheque_number(self, obj):
        if obj.receiver_type != "cheque":
            return None

        cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
        if not cheque:
            return None

        return cheque.number or cheque.sayad_number

    def get_cheque_status(self, obj):
        if obj.receiver_type != "cheque":
            return None

        cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
        if not cheque:
            return None

        return getattr(cheque, "status", None)


def validate_cheque_duplicate(number=None, sayad_number=None, bank_name=None, cheque_type=None):
    qs = Cheque.objects.filter(is_deleted=0)

    if sayad_number:
        if qs.filter(sayad_number=sayad_number).exists():
            raise ValidationError({
                "sayad_number": "شماره صیاد تکراری است."
            })

    if number and bank_name and cheque_type:
        if qs.filter(
            number=number,
            bank_name=bank_name,
            cheque_type=cheque_type,
        ).exists():
            raise ValidationError({
                "number": "شماره چک برای این بانک و نوع چک قبلاً ثبت شده است."
            })
        
class GetPaidSerializer(serializers.ModelSerializer):
    items = GetPaidItemSerializer(many=True, required=False)

    class Meta:
        model = GetPaid
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'amount': {'read_only': True},
        }

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        content_type = attrs.get(
            "getpaid_person_ct",
            getattr(instance, "getpaid_person_ct", None),
        )
        object_id = attrs.get(
            "getpaid_person_object_id",
            getattr(instance, "getpaid_person_object_id", None),
        )

        validate_person_reference(content_type, object_id)
        return attrs

    def _create_cheque_for_item(self, getpaid, item_data):
        cheque_data = item_data.pop("cheque_data", None) or {}
        receiver_type = item_data.get("receiver_type")

        if not is_cheque_type(receiver_type):
            if not item_data.get("receiver_id"):
                raise ValidationError("برای آیتم‌های غیرچکی، مقصد دریافت الزامی است.")
            return item_data

        item_data["receiver_type"] = "cheque"

        existing_cheque_id = item_data.get("receiver_id")

        if existing_cheque_id:
            cheque = Cheque.objects.filter(
                id=existing_cheque_id,
                is_deleted=0,
            ).first()

            if cheque:
                return item_data

        amount = item_data.get("amount", 0) or 0

        if amount <= 0:
            raise ValidationError("مبلغ چک دریافتی نامعتبر است.")

        number = (
            cheque_data.get("number")
            or cheque_data.get("cheque_number")
            or item_data.get("reference")
        )

        sayad_number = cheque_data.get("sayad_number")

        if not number and not sayad_number:
            raise ValidationError("شماره چک یا شماره صیاد الزامی است.")
        
        cheque_type = getattr(Cheque.ChequeType, "IN", "دریافتی")

        validate_cheque_duplicate(
            number=number,
            sayad_number=sayad_number,
            bank_name=cheque_data.get("bank_name"),
            cheque_type=cheque_type,
        )

        cheque = Cheque.objects.create(
            content_type=getpaid.getpaid_person_ct,
            object_id=getpaid.getpaid_person_object_id,
            cheque_type=cheque_type,
            status=getattr(Cheque.ChequeStatus, "PENDING", "PENDING"),
            number=number,
            sayad_number=sayad_number,
            amount=amount,
            currency=getpaid.currency or "ریال ایران",
            bank_name=cheque_data.get("bank_name"),
            bank_branch=cheque_data.get("bank_branch"),
            date=cheque_data.get("date") or cheque_data.get("due_date") or getpaid.date,
            received_date=getpaid.date,
            description=cheque_data.get("description") or item_data.get("description"),
            source_app="persons",
            source_model="GetPaid",
            source_id=getpaid.id,
            created_by=getpaid.created_by,
        )

        try:
            from Persons.services import create_cheque_initial_document

            create_cheque_initial_document(
                cheque,
                user=getpaid.created_by,
            )
        except Exception as e:
            raise ValidationError(str(e))

        item_data["receiver_id"] = cheque.id
        item_data["reference"] = item_data.get("reference") or str(number or sayad_number or "")

        return item_data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])

        getpaid = GetPaid.objects.create(**validated_data)

        total = 0

        for item_data in items_data:
            item_data = self._create_cheque_for_item(getpaid, item_data)
            validate_receiver_reference(
                item_data.get("receiver_type"),
                item_data.get("receiver_id"),
            )
            amount = item_data.get('amount', 0) or 0
            total += amount

            GetPaidItem.objects.create(
                getpaid=getpaid,
                getpaid_person_ct=getpaid.getpaid_person_ct,
                getpaid_person_object_id=getpaid.getpaid_person_object_id,
                created_by=getpaid.created_by,
                **item_data
            )

        getpaid.amount = total
        getpaid.save(update_fields=["amount"])

        try:
            from Persons.services import post_getpaid_financial_effects
            post_getpaid_financial_effects(
                getpaid,
                user=getpaid.created_by,
            )
        except ValueError as exc:
            raise ValidationError(str(exc))

        return getpaid

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()

            total = 0

            for item_data in items_data:
                item_data = self._create_cheque_for_item(instance, item_data)
                validate_receiver_reference(
                    item_data.get("receiver_type"),
                    item_data.get("receiver_id"),
                )

                amount = item_data.get('amount', 0) or 0
                total += amount

                GetPaidItem.objects.create(
                    getpaid=instance,
                    getpaid_person_ct=instance.getpaid_person_ct,
                    getpaid_person_object_id=instance.getpaid_person_object_id,
                    created_by=instance.created_by,
                    **item_data
                )

            instance.amount = total
            instance.save(update_fields=["amount"])

        return instance

class PaymentItemSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    receiver_id = serializers.IntegerField(required=False, allow_null=True)
    cheque_data = serializers.DictField(write_only=True, required=False)

    receiver_name = serializers.SerializerMethodField()
    cheque_number = serializers.SerializerMethodField()
    cheque_status = serializers.SerializerMethodField()

    class Meta:
        model = PaymentItem
        exclude = ['is_deleted']
        read_only_fields = [
            'payment',
            'payer_person_ct',
            'payer_person_object_id',
            'created_by',
            'updated_by',
            'created_at',
            'updated_at',
        ]

    def get_receiver_name(self, obj):
        if obj.receiver_type == "cheque":
            cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
            if not cheque:
                return None
            return cheque.number or cheque.sayad_number or f"چک #{cheque.id}"

        return None

    def get_cheque_number(self, obj):
        if obj.receiver_type != "cheque":
            return None

        cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
        if not cheque:
            return None

        return cheque.number or cheque.sayad_number

    def get_cheque_status(self, obj):
        if obj.receiver_type != "cheque":
            return None

        cheque = Cheque.objects.filter(id=obj.receiver_id, is_deleted=0).first()
        if not cheque:
            return None

        return getattr(cheque, "status", None)

class PaymentSerializer(serializers.ModelSerializer):
    items = PaymentItemSerializer(many=True, required=False)

    class Meta:
        model = Payment
        exclude = ['is_deleted']
        extra_kwargs = {
            'created_by': {'read_only': True},
            'updated_by': {'read_only': True},
            'created_at': {'read_only': True},
            'updated_at': {'read_only': True},
            'amount': {'read_only': True},
        }

    def validate(self, attrs):
        instance = getattr(self, "instance", None)

        content_type = attrs.get(
            "payer_person_ct",
            getattr(instance, "payer_person_ct", None),
        )
        object_id = attrs.get(
            "payer_person_object_id",
            getattr(instance, "payer_person_object_id", None),
        )

        validate_person_reference(content_type, object_id)
        return attrs

    def _create_cheque_for_item(self, payment, item_data):
        cheque_data = item_data.pop("cheque_data", None) or {}

        if item_data.get("receiver_type") != "cheque":
            if not item_data.get("receiver_id"):
                raise ValidationError("برای آیتم‌های غیرچکی، مقصد پرداخت الزامی است.")
            return item_data

        if item_data.get("receiver_id"):
            return item_data

        amount = item_data.get("amount", 0) or 0

        if amount <= 0:
            raise ValidationError("مبلغ چک پرداختی نامعتبر است.")

        number = (
            cheque_data.get("number")
            or cheque_data.get("cheque_number")
            or item_data.get("reference")
        )

        sayad_number = cheque_data.get("sayad_number")

        if not number and not sayad_number:
            raise ValidationError("شماره چک یا شماره صیاد الزامی است.")
        
        cheque_type = getattr(Cheque.ChequeType, "OUT", "پرداختی")

        validate_cheque_duplicate(
            number=number,
            sayad_number=sayad_number,
            bank_name=cheque_data.get("bank_name"),
            cheque_type=cheque_type,
        )

        cheque = Cheque.objects.create(
            content_type=payment.payer_person_ct,
            object_id=payment.payer_person_object_id,
            cheque_type=cheque_type,
            status=getattr(Cheque.ChequeStatus, "PENDING", "PENDING"),
            number=number,
            sayad_number=sayad_number,
            amount=amount,
            currency=payment.currency or "ریال ایران",
            bank_name=cheque_data.get("bank_name"),
            bank_branch=cheque_data.get("bank_branch"),
            date=cheque_data.get("date") or cheque_data.get("due_date") or payment.date,
            received_date=payment.date,
            description=cheque_data.get("description") or item_data.get("description"),
            source_app="persons",
            source_model="Payment",
            source_id=payment.id,
            created_by=payment.created_by,
        )

        try:
            from Persons.services import create_cheque_initial_document
            create_cheque_initial_document(
                cheque,
                user=payment.created_by,
            )
        except Exception as e:
            raise ValidationError(str(e))

        item_data["receiver_id"] = cheque.id
        item_data["reference"] = item_data.get("reference") or str(number or sayad_number or "")
        return item_data

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        payment = Payment.objects.create(**validated_data)

        total = 0

        for item_data in items_data:
            item_data = self._create_cheque_for_item(payment, item_data)
            validate_receiver_reference(
                item_data.get("receiver_type"),
                item_data.get("receiver_id"),
            )
            amount = item_data.get('amount', 0) or 0
            total += amount

            PaymentItem.objects.create(
                payment=payment,
                payer_person_ct=payment.payer_person_ct,
                payer_person_object_id=payment.payer_person_object_id,
                created_by=payment.created_by,
                **item_data
            )

        payment.amount = total
        payment.save(update_fields=["amount"])

        try:
            from Persons.services import post_payment_financial_effects
            post_payment_financial_effects(
                payment,
                user=payment.created_by,
            )
        except ValueError as exc:
            raise ValidationError(str(exc))

        return payment

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        if items_data is not None:
            instance.items.all().delete()

            total = 0

            for item_data in items_data:
                item_data = self._create_cheque_for_item(instance, item_data)
                validate_receiver_reference(
                    item_data.get("receiver_type"),
                    item_data.get("receiver_id"),
                )
                amount = item_data.get('amount', 0) or 0
                total += amount

                PaymentItem.objects.create(
                    payment=instance,
                    payer_person_ct=instance.payer_person_ct,
                    payer_person_object_id=instance.payer_person_object_id,
                    created_by=instance.created_by,
                    **item_data
                )

            instance.amount = total
            instance.save(update_fields=["amount"])

        return instance


