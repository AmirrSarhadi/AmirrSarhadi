import { getAllPages } from "../../../api/lists";
import { API_BASE_URL, extractList } from "../../../api/http";
// src/pages/Products/AddProduct/Step3Category.jsx
import { useEffect, useState } from "react";
import styles from "./AddProductForm.module.css";

const labels = {
  material_group_name: "گروه کالا",
  material_category_name: "دسته‌بندی",
  material_brand_name: "برند",
  material_vendor: "تأمین‌کننده",
};

const endpoints = {
  groups: `${API_BASE_URL}/services/api/v2/material-groups/`,
  categories: `${API_BASE_URL}/services/api/v2/material-categories/`,
  brands: `${API_BASE_URL}/services/api/v2/material-brands/`,
  vendors: `${API_BASE_URL}/services/api/v2/vendors/`,
};

function Step3Category({ formData, setFormData }) {
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupRes, categoryRes, brandRes, vendorRes] = await Promise.all([
          getAllPages(endpoints.groups),
          getAllPages(endpoints.categories),
          getAllPages(endpoints.brands),
          getAllPages(endpoints.vendors),
        ]);

        setGroups(extractList(groupRes.data));
        setCategories(extractList(categoryRes.data));
        setBrands(extractList(brandRes.data));
        setVendors(extractList(vendorRes.data));
      } catch (err) {
        console.error("Failed to fetch data for category step:", err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className={styles.stepContainer}>
      <h3>دسته‌بندی</h3>

      {/* ردیف 1: گروه کالا و دسته‌بندی */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>
            {labels.material_group_name}{" "}
            <span className={styles.required}>*</span>
          </label>
          <select
            name="material_group_name"
            value={formData.material_group_name}
            onChange={handleChange}
            className={!formData.material_group_name ? styles.inputEmpty : ""}
          >
            <option value=""> انتخاب کنید ... </option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.col}>
          <label>
            {labels.material_category_name}{" "}
            <span className={styles.required}>*</span>
          </label>
          <select
            name="material_category_name"
            value={formData.material_category_name}
            onChange={handleChange}
            className={
              !formData.material_category_name ? styles.inputEmpty : ""
            }
          >
            <option value=""> انتخاب کنید ... </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ردیف 2: برند و تأمین‌کننده */}
      <div className={styles.row}>
        <div className={styles.col}>
          <label>{labels.material_brand_name}</label>
          <select
            name="material_brand_name"
            value={formData.material_brand_name}
            onChange={handleChange}
          >
            <option value=""> انتخاب کنید ... </option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.col}>
          <label>
            {labels.material_vendor} <span className={styles.required}>*</span>
          </label>
          <select
            name="material_vendor"
            value={formData.material_vendor}
            onChange={handleChange}
            className={!formData.material_vendor ? styles.inputEmpty : ""}
          >
            <option value=""> انتخاب کنید ... </option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default Step3Category;
