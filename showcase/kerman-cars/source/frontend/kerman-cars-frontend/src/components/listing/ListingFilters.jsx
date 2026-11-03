import {
    RotateCcw,
    Search,
    SlidersHorizontal,
} from "lucide-react";

import "./ListingFilters.scss";

function ListingFilters({
    filters,
    brands,
    onChange,
    onReset,
}) {
    const handleChange = (event) => {
        const { name, value } = event.target;

        onChange({
            ...filters,
            [name]: value,
        });
    };

    return (
        <div className="listing-filters">
            <div className="listing-filters__header">
                <div>
                    <SlidersHorizontal size={20} />
                    <strong>فیلتر آگهی‌ها</strong>
                </div>

                <button
                    type="button"
                    onClick={onReset}
                    className="listing-filters__reset"
                >
                    <RotateCcw size={15} />
                    پاک‌کردن
                </button>
            </div>

            <div className="listing-filters__section">
                <label
                    htmlFor="listing-search"
                    className="form-label"
                >
                    جست‌وجوی خودرو
                </label>

                <div className="listing-filters__search">
                    <Search size={18} />

                    <input
                        id="listing-search"
                        type="search"
                        name="search"
                        className="form-control"
                        value={filters.search}
                        onChange={handleChange}
                        placeholder="نام، مدل یا محله"
                    />
                </div>
            </div>

            <div className="listing-filters__section">
                <label htmlFor="brand" className="form-label">
                    برند خودرو
                </label>

                <select
                    id="brand"
                    name="brand"
                    className="form-select"
                    value={filters.brand}
                    onChange={handleChange}
                >
                    <option value="">همه برندها</option>

                    {brands.map((brand) => (
                        <option key={brand} value={brand}>
                            {brand}
                        </option>
                    ))}
                </select>
            </div>

            <div className="listing-filters__section">
                <span className="form-label d-block">
                    محدوده قیمت
                </span>

                <div className="listing-filters__price">
                    <input
                        type="number"
                        name="minPrice"
                        className="form-control"
                        value={filters.minPrice}
                        onChange={handleChange}
                        placeholder="حداقل قیمت"
                        min="0"
                    />

                    <input
                        type="number"
                        name="maxPrice"
                        className="form-control"
                        value={filters.maxPrice}
                        onChange={handleChange}
                        placeholder="حداکثر قیمت"
                        min="0"
                    />
                </div>

                <small>مبلغ به تومان وارد شود</small>
            </div>

            <div className="listing-filters__section">
                <label
                    htmlFor="transmission"
                    className="form-label"
                >
                    گیربکس
                </label>

                <select
                    id="transmission"
                    name="transmission"
                    className="form-select"
                    value={filters.transmission}
                    onChange={handleChange}
                >
                    <option value="">همه</option>
                    <option value="اتوماتیک">اتوماتیک</option>
                    <option value="دنده‌ای">دنده‌ای</option>
                </select>
            </div>

            <div className="listing-filters__section">
                <label
                    htmlFor="bodyStatus"
                    className="form-label"
                >
                    وضعیت بدنه
                </label>

                <select
                    id="bodyStatus"
                    name="bodyStatus"
                    className="form-select"
                    value={filters.bodyStatus}
                    onChange={handleChange}
                >
                    <option value="">همه وضعیت‌ها</option>
                    <option value="بدون رنگ">بدون رنگ</option>
                    <option value="یک لکه رنگ">
                        یک لکه رنگ
                    </option>
                </select>
            </div>

            <div className="listing-filters__section">
                <label
                    htmlFor="sellerType"
                    className="form-label"
                >
                    نوع فروشنده
                </label>

                <select
                    id="sellerType"
                    name="sellerType"
                    className="form-select"
                    value={filters.sellerType}
                    onChange={handleChange}
                >
                    <option value="">همه فروشندگان</option>
                    <option value="personal">
                        فروشنده شخصی
                    </option>
                    <option value="dealer">نمایشگاه</option>
                </select>
            </div>

            <label className="listing-filters__checkbox">
                <input
                    type="checkbox"
                    name="featuredOnly"
                    checked={filters.featuredOnly}
                    onChange={(event) =>
                        onChange({
                            ...filters,
                            featuredOnly: event.target.checked,
                        })
                    }
                />

                <span>فقط آگهی‌های ویژه</span>
            </label>
        </div>
    );
}

export default ListingFilters;