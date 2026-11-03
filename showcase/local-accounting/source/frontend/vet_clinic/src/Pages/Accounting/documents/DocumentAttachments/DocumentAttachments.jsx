import { authFetch } from "../../../../api/http";
import { API_BASE_URL } from "../../../../api/http";
import { useEffect, useRef, useState } from "react";
import styles from "./DocumentAttachments.module.css";
import useModulePermission from "../../../../hooks/useModulePermission";

const ACCOUNTING_BASE = `${API_BASE_URL}/accounting/api/v2`;
const ACCOUNTING_DETAIL_BASE = `${API_BASE_URL}/accounting/api`;

export default function DocumentAttachments({ documentId }) {
    const { canWrite, disabledReason } = useModulePermission("accounting");
    const fileInputRef = useRef(null);

    const [attachments, setAttachments] = useState([]);
    const [title, setTitle] = useState("");
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        if (documentId) {
            fetchAttachments();
        }
    }, [documentId]);

    const safeJson = async (res) => {
        const text = await res.text();

        try {
            return JSON.parse(text);
        } catch {
            console.error("Response is not JSON:", text);
            throw new Error(`Invalid JSON response: ${res.url}`);
        }
    };

    const fetchAttachments = async () => {
        try {
            setLoading(true);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${documentId}/v2/documents/attachments/`);
            const data = await safeJson(res);

            setAttachments(Array.isArray(data) ? data : data.results || []);
        } catch (err) {
            console.error(err);
            alert("خطا در دریافت پیوست‌ها");
        } finally {
            setLoading(false);
        }
    };

    const guardWrite = () => {
        if (!canWrite) {
            alert(disabledReason);
            return true;
        }

        return false;
    };

    const uploadAttachment = async () => {
        if (guardWrite()) return;

        if (!file) {
            alert("ابتدا فایل را انتخاب کن");
            return;
        }

        try {
            setUploading(true);

            const formData = new FormData();
            formData.append("title", title || file.name);
            formData.append("file", file);

            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${documentId}/v2/documents/attachments/`, {
                method: "POST",
                body: formData,
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("آپلود فایل انجام نشد");
                return;
            }

            setTitle("");
            setFile(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            await fetchAttachments();
            alert("فایل با موفقیت پیوست شد");
        } catch (err) {
            console.error(err);
            alert("خطا در آپلود فایل");
        } finally {
            setUploading(false);
        }
    };

    const deleteAttachment = async (attachment) => {
        if (guardWrite()) return;

        const ok = window.confirm(`پیوست "${attachment.title || attachment.file_name}" حذف شود؟`);
        if (!ok) return;

        try {
            const res = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${attachment.id}/v2/attachments/delete/`, {
                method: "DELETE",
            });

            const data = await safeJson(res);

            if (!res.ok) {
                console.error(data);
                alert("حذف پیوست انجام نشد");
                return;
            }

            await fetchAttachments();
            alert("پیوست حذف شد");
        } catch (err) {
            console.error(err);
            alert("خطا در حذف پیوست");
        }
    };

    const downloadAttachment = async (attachment) => {
        try {
            const response = await authFetch(`${ACCOUNTING_DETAIL_BASE}/${attachment.id}/v2/attachments/download/`);
            if (!response.ok) throw new Error("Download failed");
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement("a");
            link.href = url;
            link.download = (attachment.file_name || "attachment").split("/").pop();
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            alert("دریافت پیوست انجام نشد.");
        }
    };

    const formatSize = (size) => {
        const value = Number(size || 0);

        if (value < 1024) return `${value} B`;
        if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;

        return `${(value / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h4>پیوست‌های سند</h4>
                    <p>رسید، فاکتور، قرارداد یا هر فایل مرتبط با سند را اینجا بارگذاری کن.</p>
                </div>
            </div>

            <div className={styles.uploadBox}>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="عنوان فایل، مثلاً فاکتور خرید"
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                />

                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    disabled={!canWrite}
                    title={!canWrite ? disabledReason : undefined}
                />

                <button
                    type="button"
                    onClick={uploadAttachment}
                    disabled={uploading || !canWrite}
                    title={!canWrite ? disabledReason : undefined}
                >
                    {uploading ? "در حال آپلود..." : "آپلود فایل"}
                </button>
            </div>

            {file && (
                <div className={styles.selectedFile}>
                    فایل انتخاب شده: <strong>{file.name}</strong>
                </div>
            )}

            {loading ? (
                <div className={styles.loadingBox}>در حال دریافت پیوست‌ها...</div>
            ) : attachments.length === 0 ? (
                <div className={styles.emptyState}>هنوز پیوستی برای این سند ثبت نشده است.</div>
            ) : (
                <div className={styles.list}>
                    {attachments.map((item) => (
                        <div className={styles.attachmentCard} key={item.id}>
                            <div>
                                <strong>{item.title || item.file_name}</strong>
                                <span>
                                    {item.file_name || "-"} · {formatSize(item.file_size)}
                                </span>
                            </div>

                            <div className={styles.actions}>
                                {item.file_url && (
                                    <button type="button" onClick={() => downloadAttachment(item)}>
                                        دریافت فایل
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => deleteAttachment(item)}
                                    disabled={!canWrite}
                                    title={!canWrite ? disabledReason : undefined}
                                >
                                    حذف
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
