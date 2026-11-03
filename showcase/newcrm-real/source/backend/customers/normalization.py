import re
import unicodedata

from django.core.exceptions import ValidationError
from django.core.validators import validate_email


def normalize_search(value):
    value = unicodedata.normalize("NFKC", value).translate(str.maketrans({"ي": "ی", "ك": "ک", "\u200c": " ", "ـ": ""}))
    value = "".join(str(unicodedata.decimal(char)) if char.isdecimal() else char
                    for char in value if unicodedata.category(char) != "Mn")
    return " ".join(value.casefold().split())


def normalize_phone(value):
    if not isinstance(value, str) or len(value) > 40:
        raise ValidationError("شماره تلفن معتبر وارد کنید.")
    value = normalize_search(value)
    if not re.fullmatch(r"[0-9+()\s-]+", value):
        raise ValidationError("شماره تلفن معتبر وارد کنید.")
    value = re.sub(r"[()\s-]", "", value)
    if value.startswith("00"):
        value = "+" + value[2:]
    elif re.fullmatch(r"0[1-9][0-9]{9}", value):
        value = "+98" + value[1:]
    if not re.fullmatch(r"\+[1-9][0-9]{7,14}", value):
        raise ValidationError("شماره را با کد کشور یا در قالب ۱۱رقمی ایران وارد کنید.")
    return value


def text_list(value, *, limit=20, length=80):
    if not isinstance(value, list) or len(value) > limit:
        raise ValidationError(f"حداکثر {limit} مقدار مجاز است.")
    result = []
    for item in value:
        if not isinstance(item, str) or not item.strip() or len(item.strip()) > length:
            raise ValidationError(f"هر مقدار باید متن غیرخالی با حداکثر {length} نویسه باشد.")
        item = item.strip()
        if normalize_search(item) in {normalize_search(previous) for previous in result}:
            raise ValidationError("مقدار تکراری در همین فهرست وجود دارد.")
        result.append(item)
    return result


def phones(value):
    result = [normalize_phone(item) for item in text_list(value, limit=10, length=40)]
    if len(set(result)) != len(result):
        raise ValidationError("شماره تکراری در همین پرونده وجود دارد.")
    return result


def emails(value):
    result = [item.casefold() for item in text_list(value, limit=10, length=254)]
    for item in result:
        validate_email(item)
    return result


def phone_search_values(values):
    return " ".join(alias for value in values for alias in
                    (value, value[1:], "0" + value[3:] if value.startswith("+98") else value))


def search_query(value):
    value = normalize_search(value)
    if re.fullmatch(r"[0-9+()\s-]+", value):
        value = re.sub(r"[()\s-]", "", value)
        if value.startswith("00"):
            value = "+" + value[2:]
    return value
