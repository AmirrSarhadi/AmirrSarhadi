import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import styles from "./AuditLogs.module.css";
import { authFetch } from "../../../api/http";
import { PageHero, StatGrid, StatCard } from "../../../components/ERP";
import { FaShieldAlt, FaSyncAlt } from "react-icons/fa";


export default function AuditLogs() {

    const [logs, setLogs] = useState([]);

    const [loading, setLoading] = useState(true);

    const [selectedLog, setSelectedLog] = useState(null);

    const [detailLoading, setDetailLoading] = useState(false);



    const [stats, setStats] = useState({
        total: 0,
        success: 0,
        failed: 0,
        today_actions: 0,
        active_users: 0,
    });



    const [pagination, setPagination] = useState({
        count: 0,
        next: null,
        previous: null,
        currentPage: 1,
    });



    const [filters, setFilters] = useState({
        module: "",
        action: "",
        success: "",
        search: "",
    });






    const fetchLogs = async (page = 1) => {

        try {

            setLoading(true);


            const params = new URLSearchParams();


            Object.entries(filters).forEach(([key, value]) => {

                if (value) {
                    params.append(key, value);
                }

            });


            params.append(
                "page",
                page
            );



            const res = await authFetch(
                `/auth/api/security/audit-logs/?${params.toString()}`
            );



            if (!res.ok) {

                throw new Error(
                    "دریافت گزارش فعالیت‌ها ناموفق بود"
                );

            }



            const data = await res.json();



            setLogs(
                data.results || []
            );



            setPagination({

                count: data.count || 0,

                next: data.next,

                previous: data.previous,

                currentPage: page,

            });



        } catch (error) {


            toast.error(
                error.message
            );


        } finally {

            setLoading(false);

        }

    };









    const fetchStats = async () => {

        try {


            const res = await authFetch(
                "/auth/api/security/audit-logs/stats/"
            );



            if (!res.ok) {
                return;
            }



            const data = await res.json();


            setStats(data);



        } catch (error) {


            console.error(
                "Audit stats error:",
                error
            );


        }

    };









    const fetchLogDetail = async (id) => {

        try {


            setDetailLoading(true);

            setSelectedLog(null);



            const res = await authFetch(
                `/auth/api/security/audit-logs/${id}/`
            );



            if (!res.ok) {

                throw new Error(
                    "دریافت جزئیات فعالیت ناموفق بود"
                );

            }



            const data = await res.json();



            setSelectedLog(data);



        } catch (error) {


            toast.error(
                error.message
            );


        } finally {


            setDetailLoading(false);


        }

    };







    const closeModal = () => {

        if (detailLoading) {
            return;
        }

        setSelectedLog(null);

    };








    const refreshPage = () => {

        fetchLogs(1);

        fetchStats();

    };







    useEffect(() => {

        refreshPage();

    }, []);
    return (

        <div className={styles.page}>


            <PageHero
                eyebrow="امنیت و ممیزی"
                title="گزارش فعالیت کاربران"
                description="ردیابی عملیات کاربران، وضعیت موفقیت درخواست‌ها و جزئیات رخدادهای امنیتی سیستم."
                icon={<FaShieldAlt />}
                actions={<button type="button" className={styles.refreshButton} onClick={refreshPage}><FaSyncAlt /> بروزرسانی</button>}
            />

            <StatGrid>
                <StatCard label="کل عملیات" value={Number(stats.total || 0).toLocaleString("fa-IR")} />
                <StatCard label="عملیات موفق" value={Number(stats.success || 0).toLocaleString("fa-IR")} tone="success" />
                <StatCard label="عملیات ناموفق" value={Number(stats.failed || 0).toLocaleString("fa-IR")} tone="danger" />
                <StatCard label="کاربران فعال امروز" value={Number(stats.active_users || 0).toLocaleString("fa-IR")} tone="info" />
            </StatGrid>


            {/* Filters */}

            <div className={styles.filters}>


                <input

                    placeholder="جستجو..."

                    value={filters.search}

                    onChange={(e) =>
                        setFilters({
                            ...filters,
                            search: e.target.value
                        })
                    }

                />





                <select

                    value={filters.module}

                    onChange={(e) =>
                        setFilters({
                            ...filters,
                            module: e.target.value
                        })
                    }

                >

                    <option value="">
                        همه بخش‌ها
                    </option>

                    <option value="catalog">
                        کالا و خدمات
                    </option>

                    <option value="sales">
                        فروش
                    </option>

                    <option value="purchases">
                        خرید و هزینه
                    </option>

                    <option value="accounting">
                        حسابداری
                    </option>

                    <option value="banking">
                        بانکداری
                    </option>

                    <option value="warehousing">
                        انبارداری
                    </option>

                    <option value="persons">
                        اشخاص
                    </option>

                    <option value="settings">
                        تنظیمات
                    </option>


                </select>







                <select

                    value={filters.action}

                    onChange={(e) =>
                        setFilters({
                            ...filters,
                            action: e.target.value
                        })
                    }

                >

                    <option value="">
                        همه عملیات
                    </option>

                    <option value="create">
                        ایجاد
                    </option>

                    <option value="update">
                        ویرایش
                    </option>

                    <option value="delete">
                        حذف
                    </option>

                    <option value="approve">
                        تایید
                    </option>

                    <option value="lock">
                        قفل
                    </option>


                </select>







                <select

                    value={filters.success}

                    onChange={(e) =>
                        setFilters({
                            ...filters,
                            success: e.target.value
                        })
                    }

                >

                    <option value="">
                        همه وضعیت‌ها
                    </option>

                    <option value="true">
                        موفق
                    </option>

                    <option value="false">
                        ناموفق
                    </option>


                </select>







                <button
                    onClick={() => fetchLogs(1)}
                >
                    اعمال فیلتر
                </button>



            </div>









            {
                loading ? (

                    <div className={styles.loading}>
                        در حال دریافت اطلاعات...
                    </div>


                ) : (

                    <div className={styles.tableWrapper}>


                        <table>


                            <thead>

                                <tr>

                                    <th>
                                        کاربر
                                    </th>

                                    <th>
                                        بخش
                                    </th>

                                    <th>
                                        عملیات
                                    </th>

                                    <th>
                                        موضوع
                                    </th>

                                    <th>
                                        وضعیت
                                    </th>

                                    <th>
                                        تاریخ
                                    </th>


                                </tr>


                            </thead>





                            <tbody>


                                {
                                    logs.map((log) => (


                                        <tr

                                            key={log.id}

                                            className={
                                                styles.clickableRow
                                            }

                                            onClick={() =>
                                                fetchLogDetail(log.id)
                                            }

                                        >


                                            <td>
                                                {
                                                    log.user_display ||
                                                    log.username
                                                }
                                            </td>



                                            <td>
                                                {
                                                    log.module_display ||
                                                    log.module
                                                }
                                            </td>



                                            <td>
                                                {
                                                    log.action_display ||
                                                    log.action
                                                }
                                            </td>



                                            <td>
                                                {
                                                    log.object_display || "-"
                                                }
                                            </td>



                                            <td>

                                                <span

                                                    className={
                                                        log.success
                                                            ?
                                                            styles.successBadge
                                                            :
                                                            styles.errorBadge
                                                    }

                                                >

                                                    {
                                                        log.status_display ||
                                                        (
                                                            log.success
                                                                ?
                                                                "موفق"
                                                                :
                                                                "ناموفق"
                                                        )
                                                    }

                                                </span>

                                            </td>



                                            <td>

                                                {
                                                    new Date(
                                                        log.created_at
                                                    ).toLocaleString(
                                                        "fa-IR"
                                                    )
                                                }

                                            </td>



                                        </tr>


                                    ))
                                }



                            </tbody>


                        </table>


                    </div>


                )
            }









            {/* Pagination */}

            <div className={styles.pagination}>


                <button

                    disabled={!pagination.previous}

                    onClick={() =>
                        fetchLogs(
                            pagination.currentPage - 1
                        )
                    }

                >
                    صفحه قبل
                </button>




                <span>
                    صفحه {pagination.currentPage}
                </span>




                <button

                    disabled={!pagination.next}

                    onClick={() =>
                        fetchLogs(
                            pagination.currentPage + 1
                        )
                    }

                >
                    صفحه بعد
                </button>


            </div>









            {/* Modal */}


            {
                (selectedLog || detailLoading) && (

                    <div

                        className={styles.modalOverlay}

                        onClick={closeModal}

                    >


                        <div

                            className={styles.modal}

                            onClick={(e) =>
                                e.stopPropagation()
                            }

                        >


                            {
                                detailLoading ? (

                                    <div className={styles.loading}>
                                        در حال دریافت جزئیات...
                                    </div>


                                ) : selectedLog ? (

                                    <>

                                        <div className={styles.modalHeader}>


                                            <h3>
                                                جزئیات فعالیت
                                            </h3>



                                            <button
                                                onClick={closeModal}
                                            >
                                                ×
                                            </button>


                                        </div>





                                        <div className={styles.detailsGrid}>


                                            <div>
                                                <span>
                                                    کاربر
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.user_display ||
                                                        selectedLog.username
                                                    }
                                                </strong>
                                            </div>




                                            <div>
                                                <span>
                                                    بخش
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.module_display
                                                    }
                                                </strong>
                                            </div>




                                            <div>
                                                <span>
                                                    عملیات
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.action_display
                                                    }
                                                </strong>
                                            </div>




                                            <div>
                                                <span>
                                                    موضوع
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.object_display || "-"
                                                    }
                                                </strong>
                                            </div>




                                            <div>
                                                <span>
                                                    IP
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.ip_address || "-"
                                                    }
                                                </strong>
                                            </div>




                                            <div>
                                                <span>
                                                    وضعیت
                                                </span>

                                                <strong>
                                                    {
                                                        selectedLog.status_display
                                                    }
                                                </strong>
                                            </div>


                                        </div>



                                        <div className={styles.detailSection}>

                                            <h4>
                                                مسیر درخواست
                                            </h4>


                                            <code>
                                                {
                                                    selectedLog.path
                                                }
                                            </code>


                                        </div>


                                        {selectedLog.object_snapshot && (
                                            <div className={styles.detailSection}>
                                                <h4>اطلاعات آبجکت</h4>
                                                <pre>{JSON.stringify(selectedLog.object_snapshot, null, 2)}</pre>
                                            </div>
                                        )}

                                        <div className={styles.detailSection}>


                                            <h4>
                                                اطلاعات ثبت شده
                                            </h4>



                                            <pre>

                                                {
                                                    JSON.stringify(
                                                        selectedLog.metadata,
                                                        null,
                                                        2
                                                    )
                                                }

                                            </pre>


                                        </div>


                                    </>


                                ) : null
                            }



                        </div>


                    </div>


                )
            }



        </div>

    );

}