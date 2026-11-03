export function formatPrice(price) {
    if (price === null || price === undefined) {
        return "قیمت توافقی";
    }

    return `${new Intl.NumberFormat("fa-IR").format(price)} تومان`;
}

export function formatMileage(mileage) {
    return `${new Intl.NumberFormat("fa-IR").format(mileage)} کیلومتر`;
}

export function toPersianNumber(value) {
    return new Intl.NumberFormat("fa-IR").format(value);
}