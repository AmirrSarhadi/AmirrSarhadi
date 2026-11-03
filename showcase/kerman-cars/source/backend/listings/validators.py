import os
import warnings

from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from PIL import Image, UnidentifiedImageError


# --- ۱. اعتبارسنجی تصویر (با seek(0) جهت بازنشانی اشاره‌گر فایل) ---
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
ALLOWED_IMAGE_FORMATS = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
    ".webp": "WEBP",
}
MAX_IMAGE_SIZE = 3 * 1024 * 1024  # 3 MB

def validate_listing_image(file):
    extension = os.path.splitext(
        file.name
    )[1].lower()

    expected_format = (
        ALLOWED_IMAGE_FORMATS.get(extension)
    )

    if expected_format is None:
        raise ValidationError(
            "فرمت تصویر مجاز نیست. "
            "فرمت‌های مجاز: JPG، PNG و WEBP."
        )

    if file.size > settings.LISTING_IMAGE_MAX_SIZE:
        raise ValidationError(
            "حجم تصویر نمی‌تواند بیشتر "
            "از ۳ مگابایت باشد."
        )

    try:
        file.seek(0)

        with warnings.catch_warnings():
            warnings.simplefilter(
                "error",
                Image.DecompressionBombWarning,
            )

            with Image.open(file) as image:
                image.verify()

            file.seek(0)

            with Image.open(file) as image:
                image_format = image.format
                width, height = image.size

        if image_format != expected_format:
            raise ValidationError(
                "پسوند فایل با فرمت واقعی "
                "تصویر مطابقت ندارد."
            )

        if (
            width * height
            > settings.LISTING_IMAGE_MAX_PIXELS
        ):
            raise ValidationError(
                "ابعاد تصویر بیش از حد مجاز است."
            )

    except ValidationError:
        raise
    except (
        UnidentifiedImageError,
        OSError,
        ValueError,
        Image.DecompressionBombError,
        Image.DecompressionBombWarning,
    ) as exc:
        raise ValidationError(
            "فایل ارسال‌شده تصویر معتبر "
            "و سالمی نیست."
        ) from exc
    finally:
        try:
            file.seek(0)
        except (AttributeError, OSError):
            pass
# --- ۲. اعتبارسنجی‌های منطق کسب‌وکار منطبق با فیلدهای مدل Listing ---

def validate_price_by_type(price_type, price):
    """
    ۱. بررسی قیمت بر اساس نوع قیمت (نقدی/اقساطی)
    """
    # در مدل شما: fixed و negotiable و contact و installment وجود دارد
    if price_type in ['fixed', 'negotiable']:
        if not price or price <= 0:
            raise ValidationError("برای آگهی‌های با قیمت قطعی یا قابل مذاکره، وارد کردن قیمت مثبت الزامی است.")
    elif price_type == 'contact':
        if price is not None and price > 0:
            raise ValidationError("برای آگهی‌های نوع 'تماس بگیرید'، نباید قیمتی وارد شود.")


def validate_installment_conditions(price_type, down_payment, installment_amount, installment_count):
    """
    ۲. بررسی شرایط اقساط (منطبق با فیلدهای مدل: installment_count بدون s)
    """
    if price_type == 'installment':
        if not down_payment or down_payment <= 0:
            raise ValidationError("برای فروش اقساطی، تعیین مبلغ پیش‌پرداخت (بزرگتر از صفر) الزامی است.")
        if not installment_amount or installment_amount <= 0:
            raise ValidationError("تعیین مبلغ هر قسط (بزرگتر از صفر) الزامی است.")
        if not installment_count or installment_count <= 0:
            raise ValidationError("تعداد اقساط باید یک عدد مثبت و معتبر باشد.")


def validate_neighborhood_city_relation(neighborhood, city):
    """
    ۳. بررسی ارتباط محله با شهر
    """
    if neighborhood and city:
        if neighborhood.city_id != city.id:
            raise ValidationError("محله انتخاب شده متعلق به شهر انتخاب شده نیست.")


def validate_geographic_coordinates(latitude, longitude):
    """
    ۴. محدوده مختصات جغرافیایی (محدوده کشور ایران)
    """
    if latitude is not None and longitude is not None:
        # عرض جغرافیایی ایران بین ۲۵ تا ۴۰ و طول جغرافیایی بین ۴۴ تا ۶۳ است
        if not (25.0 <= float(latitude) <= 40.0) or not (44.0 <= float(longitude) <= 63.0):
            raise ValidationError("مختصات جغرافیایی وارد شده خارج از محدوده مجاز کشور ایران است.")


def validate_previous_owners_count(owner_count):
    """
    ۵. تعداد مالکان قبلی (منطبق با فیلد owner_count مدل)
    """
    if owner_count is not None:
        if owner_count < 1:
            raise ValidationError("تعداد مالکان خودرو نمی‌تواند کمتر از ۱ باشد.")
        if owner_count > 20:
            raise ValidationError("تعداد مالکان وارد شده غیرعادی است.")


def validate_insurance_expiry(insurance_months):
    """
    ۶. اعتبار بیمه به ماه
    """
    if insurance_months is not None:
        if not (0 <= insurance_months <= 12):
            raise ValidationError("مدت اعتبار بیمه خودرو باید بین ۰ تا ۱۲ ماه باشد.")


def validate_technical_inspection_date(technical_inspection_valid_until):
    """
    ۷. بررسی اعتبار تاریخ معاینه فنی (منطبق با فیلد DateField مدل)
    """
    if technical_inspection_valid_until:
        # تاریخ معاینه فنی نباید منقضی شده باشد (کوچکتر از امروز نباشد)
        if technical_inspection_valid_until < timezone.now().date():
            raise ValidationError("تاریخ اعتبار معاینه فنی خودرو منقضی شده است.")
