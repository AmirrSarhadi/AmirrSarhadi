import { useQuery } from "@tanstack/react-query";
import { getMyListings } from "../../services/listingService";
import QueryStatus from "../shared/QueryStatus";
import ActionQueue from "./ActionQueue";

const states = [
    ["needs_edit", "نیازمند اصلاح", "یادداشت مدیریت را بخوانید و آگهی را اصلاح کنید."],
    ["draft", "پیش‌نویس‌ها", "اطلاعات و تصاویر را کامل کنید و برای بررسی بفرستید."],
    ["pending", "در انتظار بررسی", "آگهی ارسال شده است؛ نتیجهٔ بررسی در پنل نمایش داده می‌شود."],
    ["rejected", "آگهی‌های ردشده", "دلیل رد آگهی را در جزئیات وضعیت ببینید."],
    ["expired", "منقضی‌شده", "این آگهی‌ها دیگر در نتایج عمومی نمایش داده نمی‌شوند."],
];
export default function OwnerActionQueue({ basePath }) {
    const query = useQuery({
        queryKey: ["my-listings", "action-queue"],
        queryFn: async ({ signal }) => Promise.all(states.map(async ([key, title, description]) => {
            const data = await getMyListings({ status: key, page_size: 1 }, signal);
            return { key, title, description, count: data.count };
        })),
    });
    return <QueryStatus query={query}>
        <ActionQueue items={(query.data || []).map(item => ({ ...item, to: `${basePath}/listings?status=${item.key}` }))} />
    </QueryStatus>;
}
