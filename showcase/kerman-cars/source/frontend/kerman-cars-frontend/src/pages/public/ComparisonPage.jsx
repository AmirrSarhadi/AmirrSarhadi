import { useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import QueryStatus from "../../components/shared/QueryStatus";
import useComparisonStore from "../../store/comparisonStore";
import { parseComparisonIds } from "../../services/comparisonData";
import { getComparison } from "../../services/listingService";
import {
    bodyStatuses,
    conditions,
    fuelTypes,
    transmissions,
    priceTypes,
} from "../../services/listingData";
import {
    formatMileage,
    formatPrice,
    toPersianNumber,
} from "../../utils/formatters";
import "../../components/comparison/Comparison.scss";
const unknown = "ثبت نشده";
const rows = [
    [
        "قیمت",
        (car) =>
            car.priceType === "contact"
                ? "تماس بگیرید"
                : formatPrice(car.price),
    ],
    ["شرایط قیمت", (car) => priceTypes[car.priceType] || unknown],
    ["برند", (car) => car.brand || unknown],
    [
        "مدل و تیپ",
        (car) => [car.model, car.trim].filter(Boolean).join("، ") || unknown,
    ],
    ["سال تولید", (car) => toPersianNumber(car.year)],
    ["کارکرد", (car) => formatMileage(car.mileage)],
    ["شهر", (car) => car.city || unknown],
    ["رنگ", (car) => car.color || unknown],
    ["وضعیت بدنه", (car) => bodyStatuses[car.body_status] || unknown],
    ["توضیحات بدنه", (car) => car.body_note || unknown],
    ["گیربکس", (car) => transmissions[car.raw.transmission] || unknown],
    ["سوخت", (car) => fuelTypes[car.raw.fuel_type] || unknown],
    ["وضعیت موتور", (car) => conditions[car.engine_status] || unknown],
    ["وضعیت گیربکس", (car) => conditions[car.transmission_status] || unknown],
    ["شاسی جلو", (car) => conditions[car.front_chassis_status] || unknown],
    ["شاسی عقب", (car) => conditions[car.rear_chassis_status] || unknown],
    ["مدارک", (car) => conditions[car.document_status] || unknown],
    [
        "بیمه باقی‌مانده (ماه)",
        (car) =>
            car.insurance_months == null
                ? unknown
                : toPersianNumber(car.insurance_months),
    ],
    [
        "تعداد مالک",
        (car) =>
            car.owner_count == null
                ? unknown
                : toPersianNumber(car.owner_count),
    ],
    ["معاوضه", (car) => (car.is_exchangeable ? "بله" : "خیر")],
    [
        "نوع فروشنده",
        (car) => (car.sellerType === "dealer" ? "نمایشگاه" : "شخصی"),
    ],
];
export default function ComparisonPage() {
    const heading = useRef(null);
    useEffect(() => {
        const previous = document.title;
        document.title = "مقایسه خودروها | کرمان کارز";
        return () => {
            document.title = previous;
        };
    }, []);
    const [params, setParams] = useSearchParams();
    const value = params.get("ids") || "";
    const { ids, error } = parseComparisonIds(value);
    const setIds = useComparisonStore((state) => state.setIds);
    useEffect(() => {
        if (!error) setIds(parseComparisonIds(value).ids);
    }, [value, error, setIds]);
    const query = useQuery({
        queryKey: ["listing-comparison", ...ids],
        queryFn: ({ signal }) => getComparison(ids, signal),
        enabled: !error && ids.length > 0,
        staleTime: 0,
    });
    const remove = (id) => {
        const next = ids.filter((item) => item !== id);
        setIds(next);
        heading.current?.focus({ preventScroll: true });
        setParams(next.length ? { ids: next.join(",") } : {});
    };
    return (
        <div className="comparison-page kc-container">
            <h1 ref={heading} tabIndex={-1}>
                مقایسه خودروها
            </h1>
            <p className="comparison-page__intro">
                تا سه خودرو را کنار هم بررسی کنید. این صفحه با نشانی فعلی قابل
                اشتراک‌گذاری است؛ انتخاب‌های خارج از این صفحه با بارگذاری مجدد
                پاک می‌شوند.
            </p>
            <Link className="btn btn-outline-primary mb-3" to="/cars">
                انتخاب خودرو از آگهی‌ها
            </Link>
            {error ? (
                <div role="alert">
                    <p>{error}</p>
                    <button
                        type="button"
                        className="btn btn-outline-primary"
                        onClick={() => setParams({})}
                    >
                        پاک کردن انتخاب نامعتبر
                    </button>
                </div>
            ) : !ids.length ? (
                <section className="comparison-page__empty">
                    <h2>هنوز خودرویی برای مقایسه انتخاب نشده</h2>
                    <p>
                        از دکمهٔ «افزودن به مقایسه» روی کارت آگهی‌ها استفاده
                        کنید.
                    </p>
                </section>
            ) : (
                <QueryStatus query={query}>
                    {query.data && (
                        <>
                            {query.data.unavailable_ids.length > 0 && (
                                <section
                                    role="status"
                                    className="comparison-page__empty mb-3"
                                >
                                    <h2>بعضی آگهی‌ها دیگر در دسترس نیستند</h2>
                                    <p>
                                        آگهی حذف‌شده، منقضی یا غیرعمومی در
                                        مقایسه نمایش داده نمی‌شود.
                                    </p>
                                    <button
                                        type="button"
                                        className="btn btn-outline-primary"
                                        onClick={() => {
                                            const next = ids.filter(
                                                (id) =>
                                                    !query.data.unavailable_ids.includes(
                                                        id,
                                                    ),
                                            );
                                            setIds(next);
                                            setParams(
                                                next.length
                                                    ? { ids: next.join(",") }
                                                    : {},
                                            );
                                        }}
                                    >
                                        حذف آگهی‌های ناموجود از انتخاب‌ها
                                    </button>
                                </section>
                            )}
                            {query.data.results.length > 0 && (
                                <div
                                    className="comparison-page__scroll"
                                    role="region"
                                    aria-label="جدول مقایسه خودروها"
                                    tabIndex={0}
                                >
                                    <table>
                                        <caption>
                                            مشخصات ثبت‌شده در آگهی‌ها؛ برای
                                            جزئیات و تماس، صفحهٔ هر خودرو را باز
                                            کنید.
                                        </caption>
                                        <thead>
                                            <tr>
                                                <th scope="col">
                                                    مشخصات خودرو
                                                </th>
                                                {query.data.results.map(
                                                    (car) => (
                                                        <th
                                                            scope="col"
                                                            key={car.id}
                                                        >
                                                            <img
                                                                src={car.image}
                                                                alt={car.title}
                                                                width="640"
                                                                height="400"
                                                            />
                                                            <h2>
                                                                <Link
                                                                    to={`/cars/${car.slug}`}
                                                                >
                                                                    {car.title}
                                                                </Link>
                                                            </h2>
                                                            <button
                                                                type="button"
                                                                className="btn btn-outline-primary"
                                                                aria-label={`حذف ${car.title} از مقایسه`}
                                                                onClick={() =>
                                                                    remove(
                                                                        car.id,
                                                                    )
                                                                }
                                                            >
                                                                حذف از مقایسه
                                                            </button>
                                                        </th>
                                                    ),
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(([label, render]) => (
                                                <tr key={label}>
                                                    <th scope="row">{label}</th>
                                                    {query.data.results.map(
                                                        (car) => (
                                                            <td key={car.id}>
                                                                {render(car)}
                                                            </td>
                                                        ),
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </QueryStatus>
            )}
        </div>
    );
}
