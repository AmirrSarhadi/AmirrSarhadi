import { bodyStatuses, transmissions, fuelTypes, priceTypes } from './listingData.js';

export const savedSearchLabels = {
    search: 'عبارت', brand: 'برند', car_model: 'مدل', trim: 'تیپ', city: 'شهر', neighborhood: 'محله',
    min_price: 'حداقل قیمت', max_price: 'حداکثر قیمت', min_year: 'از سال', max_year: 'تا سال',
    min_mileage: 'حداقل کارکرد', max_mileage: 'حداکثر کارکرد', transmission: 'گیربکس', body_status: 'وضعیت بدنه',
    fuel_type: 'سوخت', price_type: 'نوع قیمت', body_type: 'نوع بدنه', color: 'رنگ', seller_type: 'نوع فروشنده',
    ordering: 'ترتیب', is_featured: 'آگهی ویژه', is_exchangeable: 'قابل معاوضه', is_installment: 'اقساطی',
};
const orders = { newest: 'جدیدترین', oldest: 'قدیمی‌ترین', price_asc: 'ارزان‌ترین', price_desc: 'گران‌ترین', mileage_asc: 'کم‌کارکردترین', year_desc: 'جدیدترین مدل', most_viewed: 'پربازدیدترین' };
export function savedSearchValue(key, value) {
    if (typeof value === 'boolean') return value ? 'بله' : 'خیر';
    const enums = { transmission: transmissions, fuel_type: fuelTypes, body_status: bodyStatuses, price_type: priceTypes, ordering: orders, seller_type: { personal: 'شخصی', dealer: 'نمایشگاه' } };
    if (enums[key]?.[value]) return enums[key][value];
    if (/^(min|max)_(price|year|mileage)$/.test(key)) {
        const number = Number(value);
        if (Number.isFinite(number)) return `${new Intl.NumberFormat('fa-IR').format(number)}${key.endsWith('price') ? ' تومان' : key.endsWith('mileage') ? ' کیلومتر' : ''}`;
    }
    return String(value);
}
