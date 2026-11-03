import { useRef, useState } from "react";
import { CarFront, Check, Search, X } from "lucide-react";
import { mediaUrl } from "../../services/listingData";
import { toPersianNumber } from "../../utils/formatters";
import "./BrandPicker.scss";
const normalize = (text) =>
    String(text)
        .normalize("NFKC")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .toLocaleLowerCase("fa")
        .trim();

export default function BrandPicker({
    rows,
    value,
    register,
    error,
    onChange,
}) {
    const [input, setInput] = useState("");
    const [search, setSearch] = useState("");
    const [limit, setLimit] = useState(24);
    const inputRef = useRef(null);
    const composing = useRef(false);
    const filtered = rows.filter((row) =>
        normalize(row.name).includes(normalize(search)),
    );
    const shown = filtered.slice(0, limit);
    const quick = !search ? shown.slice(0, 6) : [];
    const rest = !search ? shown.slice(6) : shown;
    const selected = rows.find((row) => String(row.id) === String(value));
    const update = (text) => {
        setSearch(text);
        setLimit(24);
    };
    const choice = (brand, tile) => (
        <label
            className={`brand-picker__choice ${tile ? "brand-picker__choice--tile" : ""}`}
            key={brand.id}
        >
            <input
                type="radio"
                value={String(brand.id)}
                {...register("brand", { onChange })}
                checked={String(value) === String(brand.id)}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "brand-error" : undefined}
            />
            <span className="brand-picker__logo" aria-hidden="true">
                <CarFront size={27} />
                {brand.logo && (
                    <img
                        src={mediaUrl(brand.logo)}
                        alt=""
                        width="56"
                        height="36"
                        loading="lazy"
                        onError={(event) => {
                            event.currentTarget.hidden = true;
                        }}
                    />
                )}
            </span>
            <span className="brand-picker__name">{brand.name}</span>
            <span className="brand-picker__check" aria-hidden="true">
                {String(value) === String(brand.id) && <Check size={14} />}
            </span>
        </label>
    );
    return (
        <fieldset
            className="brand-picker col-12"
            aria-describedby={error ? "brand-error" : "brand-help"}
        >
            <legend className="visually-hidden">برند خودرو</legend>
            <p id="brand-help" className="brand-picker__help">
                برند خودروی خود را جست‌وجو یا از فهرست انتخاب کنید.
            </p>
            <div className="brand-picker__search">
                <Search size={21} aria-hidden="true" />
                <label htmlFor="brand-search" className="visually-hidden">
                    جست‌وجوی برند خودرو
                </label>
                <input
                    ref={inputRef}
                    id="brand-search"
                    type="search"
                    autoComplete="off"
                    placeholder="نام برند را بنویسید"
                    value={input}
                    onCompositionStart={() => {
                        composing.current = true;
                    }}
                    onCompositionEnd={(event) => {
                        composing.current = false;
                        update(event.currentTarget.value);
                    }}
                    onChange={(event) => {
                        setInput(event.target.value);
                        if (!composing.current) update(event.target.value);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !composing.current)
                            event.preventDefault();
                    }}
                />
                {input && (
                    <button
                        type="button"
                        aria-label="پاک کردن جست‌وجوی برند"
                        onClick={() => {
                            setInput("");
                            update("");
                            composing.current = false;
                            inputRef.current?.focus();
                        }}
                    >
                        <X size={19} aria-hidden="true" />
                    </button>
                )}
            </div>
            {selected && (
                <p className="brand-picker__selected" role="status">
                    <Check size={17} aria-hidden="true" />
                    برند انتخاب‌شده: <strong>{selected.name}</strong>
                </p>
            )}
            {error && (
                <p
                    id="brand-error"
                    className="listing-form-field__error"
                    role="alert"
                >
                    {error.message}
                </p>
            )}
            {quick.length > 0 && (
                <>
                    <h3>انتخاب سریع برند</h3>
                    <div className="brand-picker__grid">
                        {quick.map((brand) => choice(brand, true))}
                    </div>
                </>
            )}
            {rest.length > 0 && (
                <>
                    <h3>{search ? "نتایج جست‌وجو" : "سایر برندها"}</h3>
                    <div
                        className="brand-picker__list"
                        role="region"
                        aria-label="فهرست برندها"
                        tabIndex={0}
                    >
                        {rest.map((brand) => choice(brand, false))}
                    </div>
                </>
            )}
            {!filtered.length && (
                <p role="status" className="brand-picker__empty">
                    {rows.length
                        ? "برندی با این نام پیدا نشد؛ عبارت دیگری جست‌وجو کنید."
                        : "هنوز برندی در سامانه ثبت نشده است."}
                </p>
            )}
            <p className="brand-picker__count" role="status">
                {toPersianNumber(filtered.length)} برند
                {shown.length < filtered.length
                    ? `؛ ${toPersianNumber(shown.length)} مورد نمایش داده شده`
                    : ""}
            </p>
            {shown.length < filtered.length && (
                <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => setLimit((current) => current + 24)}
                >
                    نمایش برندهای بیشتر
                </button>
            )}
        </fieldset>
    );
}
