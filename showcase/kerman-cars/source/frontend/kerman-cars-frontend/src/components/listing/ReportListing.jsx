import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import queryClient from "../../services/queryClient";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import ConfirmDialog from "../shared/ConfirmDialog";

const reasons = {
    fraud: "کلاهبرداری",
    wrong_info: "اطلاعات نادرست",
    unreal_price: "قیمت غیرواقعی",
    duplicate: "آگهی تکراری",
    inappropriate: "محتوای نامناسب",
    other: "سایر",
};
export default function ReportListing({ listing, onClose }) {
    const [reason, setReason] = useState("wrong_info");
    const [description, setDescription] = useState("");
    const mutation = useMutation({
        mutationFn: () =>
            apiClient.post("moderation/reports/", {
                listing_id: listing.id,
                reason,
                description,
            }),
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ["my-reports"] });
            toast.success("گزارش شما ثبت شد.");
            onClose();
        },
    });
    return (
        <ConfirmDialog
            title={`گزارش «${listing.title}»`}
            pending={mutation.isPending}
            onCancel={onClose}
            onConfirm={() => mutation.mutate()}
            confirmLabel="ثبت گزارش"
        >
            <label htmlFor="report-reason">دلیل گزارش</label>
            <select
                id="report-reason"
                className="form-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={mutation.isPending}
            >
                {Object.entries(reasons).map(([value, label]) => (
                    <option key={value} value={value}>
                        {label}
                    </option>
                ))}
            </select>
            <label htmlFor="report-description">توضیحات (اختیاری)</label>
            <textarea
                id="report-description"
                className="form-control resize-none"
                rows={4}
                maxLength={3000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={mutation.isPending}
            />
            {mutation.isError && <><p role="alert">{mutation.error.message}</p><Link to="/dashboard/reports" onClick={onClose}>پیگیری گزارش‌های من</Link></>}
        </ConfirmDialog>
    );
}
