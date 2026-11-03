import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useState } from "react";
import styles from "./DocumentAuditTimeline.module.css";

const API = `${API_BASE_URL}/accounting/api`;

export default function DocumentAuditTimeline({ documentId }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (documentId) {
            fetchLogs();
        }
    }, [documentId]);

    const fetchLogs = async () => {
        try {
            setLoading(true);

            const res = await authFetch(
                `${API}/${documentId}/v2/documents/audit-logs/`
            );

            const data = await res.json();

            if (Array.isArray(data)) {
                setLogs(data);
            } else if (Array.isArray(data.results)) {
                setLogs(data.results);
            } else {
                setLogs([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (value) => {
        if (!value) return "-";

        return new Date(value).toLocaleString("fa-IR");
    };

    const getBadgeClass = (action) => {
        switch (action) {
            case "CREATE":
                return styles.create;

            case "UPDATE":
                return styles.update;

            case "APPROVE":
                return styles.approve;

            case "LOCK":
                return styles.lock;

            case "UNLOCK":
                return styles.unlock;

            case "DELETE":
                return styles.delete;

            default:
                return styles.default;
        }
    };

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    در حال دریافت تاریخچه...
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>تاریخچه عملیات سند</h3>
                <p>
                    تمام عملیات ثبت شده روی این سند
                </p>
            </div>

            {logs.length === 0 ? (
                <div className={styles.empty}>
                    هیچ عملیاتی ثبت نشده است
                </div>
            ) : (
                <div className={styles.timeline}>
                    {logs.map((log) => (
                        <div
                            className={styles.timelineItem}
                            key={log.id}
                        >
                            <div className={styles.line} />

                            <div
                                className={`${styles.badge} ${getBadgeClass(log.action)}`}
                            >
                                {log.action_display}
                            </div>

                            <div className={styles.content}>
                                <div className={styles.topRow}>
                                    <strong>
                                        {log.description}
                                    </strong>

                                    <span>
                                        {formatDate(log.created_at)}
                                    </span>
                                </div>

                                <div className={styles.bottomRow}>
                                    توسط:
                                    <b>{log.created_by || "-"}</b>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}