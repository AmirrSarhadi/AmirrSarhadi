import { useEffect, useMemo, useState } from "react";
import {
    FaEdit,
    FaLock,
    FaPlus,
    FaSave,
    FaSearch,
    FaTrash,
    FaUserShield,
} from "react-icons/fa";
import { toast } from "react-toastify";
import { extractList, API_BASE_URL, authFetch } from "../../../api/http";
import { useAuth } from "../../../hooks/useAuth";
import styles from "./UserManagement.module.css";
import { PageHero, StatGrid, StatCard } from "../../../components/ERP";

const ROLE_LABELS = {
    super_admin: "مدیر کل",
    admin: "مدیر سیستم",
    accountant: "حسابدار",
    sales: "فروش",
    warehouse: "انباردار",
    viewer: "مشاهده‌گر",
};

const emptyForm = {
    username: "",
    password: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "viewer",
    is_active: true,
};

export default function UserManagement() {
    const { user: currentUser } = useAuth();

    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [editingUser, setEditingUser] = useState(null);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const canEditSuperAdmin = Boolean(
        currentUser?.is_superuser || currentUser?.role === "super_admin"
    );

    const filteredUsers = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) return users;

        return users.filter((item) => {
            const text = [
                item.username,
                item.first_name,
                item.last_name,
                item.full_name,
                item.email,
                item.role,
            ]
                .join(" ")
                .toLowerCase();

            return text.includes(term);
        });
    }, [users, search]);

    const roleOptions = useMemo(() => {
        const normalized = roles.map((role) => role.name);

        if (!normalized.includes("viewer")) {
            normalized.push("viewer");
        }

        return normalized.filter(
            (role) => role !== "super_admin" || canEditSuperAdmin
        );
    }, [roles, canEditSuperAdmin]);

    const fetchData = async () => {
        try {
            setLoading(true);

            const [usersRes, rolesRes] = await Promise.all([
                authFetch(`${API_BASE_URL}/auth/api/users/`),
                authFetch(`${API_BASE_URL}/auth/api/roles/`),
            ]);

            const usersData = await usersRes.json();
            const rolesData = await rolesRes.json();

            if (!usersRes.ok) {
                throw new Error(usersData?.detail || "خطا در دریافت کاربران");
            }

            if (!rolesRes.ok) {
                throw new Error(rolesData?.detail || "خطا در دریافت نقش‌ها");
            }

            setUsers(extractList(usersData));
            setRoles(extractList(rolesData));
        } catch (error) {
            console.error(error);
            toast.error(error.message || "خطا در دریافت اطلاعات کاربران");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const resetForm = () => {
        setEditingUser(null);
        setForm(emptyForm);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const startEdit = (user) => {
        setEditingUser(user);

        setForm({
            username: user.username || "",
            password: "",
            first_name: user.first_name || "",
            last_name: user.last_name || "",
            email: user.email || "",
            role: user.role || "viewer",
            is_active: Boolean(user.is_active),
        });
    };

    const validateForm = () => {
        if (!editingUser && !form.username.trim()) {
            toast.error("نام کاربری را وارد کن.");
            return false;
        }

        if (!editingUser && !form.password.trim()) {
            toast.error("رمز عبور اولیه را وارد کن.");
            return false;
        }

        if (!form.email.trim()) {
            toast.error("برای دریافت کد تایید ورود، ایمیل کاربر الزامی است.");
            return false;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(form.email.trim())) {
            toast.error("ایمیل واردشده معتبر نیست.");
            return false;
        }

        if (!editingUser && form.password.length < 8) {
            toast.error("رمز عبور باید حداقل ۸ کاراکتر باشد.");
            return false;
        }

        if (editingUser && form.password && form.password.length < 8) {
            toast.error("رمز عبور جدید باید حداقل ۸ کاراکتر باشد.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setSaving(true);

            const payload = {
                first_name: form.first_name,
                last_name: form.last_name,
                email: form.email,
                role: form.role,
                is_active: form.is_active,
            };

            if (form.password.trim()) {
                payload.password = form.password;
            }

            let res;

            if (editingUser) {
                res = await authFetch(
                    `${API_BASE_URL}/auth/api/users/${editingUser.id}/`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    }
                );
            } else {
                res = await authFetch(`${API_BASE_URL}/auth/api/users/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ...payload,
                        username: form.username.trim(),
                        password: form.password,
                    }),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                const firstError =
                    data?.username?.[0] ||
                    data?.password?.[0] ||
                    data?.email?.[0] ||
                    data?.role?.[0] ||
                    data?.detail ||
                    "خطا در ذخیره کاربر";

                throw new Error(firstError);
            }

            toast.success(editingUser ? "کاربر بروزرسانی شد." : "کاربر جدید ساخته شد.");
            resetForm();
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "خطا در ذخیره کاربر");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        if (user.id === currentUser?.id) {
            toast.error("نمی‌توانی حساب خودت را حذف کنی.");
            return;
        }

        if (user.is_superuser || user.role === "super_admin") {
            toast.error("super_admin از این بخش قابل حذف نیست.");
            return;
        }

        const confirmed = window.confirm(
            `آیا از حذف کاربر «${user.full_name || user.username}» مطمئن هستی؟`
        );

        if (!confirmed) return;

        try {
            const res = await authFetch(`${API_BASE_URL}/auth/api/users/${user.id}/`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data?.detail || "خطا در حذف کاربر");
            }

            toast.success("کاربر حذف شد.");
            fetchData();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "خطا در حذف کاربر");
        }
    };

    const getRoleLabel = (role) => ROLE_LABELS[role] || role || "-";

    return (
        <div className={styles.page}>
            <PageHero
                eyebrow="امنیت و دسترسی"
                title="مدیریت کاربران و نقش‌ها"
                description="ساخت حساب، مدیریت نقش، وضعیت دسترسی و بازنشانی رمز عبور کاربران سیستم."
                icon={<FaUserShield />}
                actions={<button type="button" onClick={resetForm} className={styles.newBtn}><FaPlus /> کاربر جدید</button>}
            />

            <StatGrid>
                <StatCard label="کل کاربران" value={users.length.toLocaleString("fa-IR")} />
                <StatCard label="کاربران فعال" value={users.filter((item) => item.is_active).length.toLocaleString("fa-IR")} tone="success" />
                <StatCard label="نتیجه جستجو" value={filteredUsers.length.toLocaleString("fa-IR")} tone="info" />
                <StatCard label="نقش‌های قابل تخصیص" value={roleOptions.length.toLocaleString("fa-IR")} tone="warning" />
            </StatGrid>

            <div className={styles.layout}>
                <form className={styles.formCard} onSubmit={handleSubmit}>
                    <div className={styles.formTitle}>
                        <FaUserShield />
                        <h3>{editingUser ? "ویرایش کاربر" : "ساخت کاربر جدید"}</h3>
                    </div>

                    <div className={styles.formGrid}>
                        <label>
                            <span>نام کاربری</span>
                            <input
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                disabled={!!editingUser}
                                placeholder="مثلاً sales1"
                            />
                        </label>

                        <label>
                            <span>
                                {editingUser ? "رمز عبور جدید" : "رمز عبور اولیه"}
                            </span>
                            <input
                                name="password"
                                type="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder={
                                    editingUser
                                        ? "برای عدم تغییر، خالی بگذار"
                                        : "حداقل ۸ کاراکتر"
                                }
                            />
                        </label>

                        <label>
                            <span>نام</span>
                            <input
                                name="first_name"
                                value={form.first_name}
                                onChange={handleChange}
                                placeholder="نام"
                            />
                        </label>

                        <label>
                            <span>نام خانوادگی</span>
                            <input
                                name="last_name"
                                value={form.last_name}
                                onChange={handleChange}
                                placeholder="نام خانوادگی"
                            />
                        </label>

                        <label>
                            <span>ایمیل</span>
                            <input
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="شماره تماس"
                            />
                        </label>

                        <label>
                            <span>نقش</span>
                            <select
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                disabled={editingUser?.is_superuser && !canEditSuperAdmin}
                            >
                                {roleOptions.map((role) => (
                                    <option key={role} value={role}>
                                        {getRoleLabel(role)}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <label className={styles.checkRow}>
                        <input
                            type="checkbox"
                            name="is_active"
                            checked={form.is_active}
                            onChange={handleChange}
                            disabled={editingUser?.is_superuser && !canEditSuperAdmin}
                        />
                        <span>کاربر فعال باشد</span>
                    </label>

                    <div className={styles.formActions}>
                        <button type="submit" disabled={saving}>
                            <FaSave />
                            {saving ? "در حال ذخیره..." : "ذخیره"}
                        </button>

                        {editingUser && (
                            <button
                                type="button"
                                onClick={resetForm}
                                className={styles.cancelBtn}
                            >
                                انصراف
                            </button>
                        )}
                    </div>
                </form>

                <section className={styles.tableCard}>
                    <div className={styles.tableHeader}>
                        <div>
                            <h3>لیست کاربران</h3>
                            <p>{users.length.toLocaleString("fa-IR")} کاربر ثبت شده</p>
                        </div>

                        <div className={styles.searchBox}>
                            <FaSearch />
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="جستجو کاربر..."
                            />
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table>
                            <thead>
                                <tr>
                                    <th>کاربر</th>
                                    <th>نام کاربری</th>
                                    <th>نقش</th>
                                    <th>وضعیت</th>
                                    <th>Staff</th>
                                    <th>آخرین ورود</th>
                                    <th>عملیات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className={styles.empty}>
                                            در حال دریافت اطلاعات...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className={styles.empty}>
                                            کاربری پیدا نشد.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((item) => {
                                        const isLockedSuperAdmin =
                                            item.is_superuser && !canEditSuperAdmin;

                                        return (
                                            <tr key={item.id}>
                                                <td>
                                                    <strong>{item.full_name || item.username}</strong>
                                                    <small>{item.email || "بدون ایمیل"}</small>
                                                </td>

                                                <td>{item.username}</td>

                                                <td>
                                                    <span className={styles.roleBadge}>
                                                        {getRoleLabel(item.role)}
                                                    </span>
                                                </td>

                                                <td>
                                                    {item.is_active ? (
                                                        <span className={styles.activeBadge}>فعال</span>
                                                    ) : (
                                                        <span className={styles.inactiveBadge}>غیرفعال</span>
                                                    )}
                                                </td>

                                                <td>{item.is_staff ? "بله" : "خیر"}</td>

                                                <td>
                                                    {item.last_login
                                                        ? String(item.last_login).split("T")[0]
                                                        : "-"}
                                                </td>

                                                <td>
                                                    <div className={styles.rowActions}>
                                                        <button
                                                            type="button"
                                                            onClick={() => startEdit(item)}
                                                            disabled={isLockedSuperAdmin}
                                                            title="ویرایش"
                                                        >
                                                            <FaEdit />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                startEdit(item);
                                                                toast.info("رمز عبور جدید را در فرم وارد و ذخیره کن.");
                                                            }}
                                                            disabled={isLockedSuperAdmin}
                                                            title="ریست رمز"
                                                        >
                                                            <FaLock />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDelete(item)}
                                                            disabled={
                                                                item.id === currentUser?.id ||
                                                                item.is_superuser
                                                            }
                                                            title="حذف"
                                                            className={styles.deleteBtn}
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}