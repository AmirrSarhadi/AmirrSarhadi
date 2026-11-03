import { useQuery } from "@tanstack/react-query";
import apiClient from "../../services/apiClient";

async function loadCities({ signal }) {
    const cities = [];
    for (let page = 1; ; page += 1) {
        const { data } = await apiClient.get("locations/cities/", { params: { page, page_size: 100 }, signal, skipAuth: true });
        if (Array.isArray(data)) return data;
        cities.push(...data.results);
        if (!data.next) return cities;
    }
}

export default function CitySelect({ id, registration, error, ...props }) {
    const { data: cities = [], isPending, isError, refetch } = useQuery({ queryKey: ["cities"], queryFn: loadCities });
    const message = error || (isError ? "دریافت شهرها انجام نشد." : !isPending && !cities.length ? "هنوز شهری در سامانه ثبت نشده است." : "");
    return <>
        <select {...props} {...registration} id={id} disabled={isPending || isError || !cities.length}
            aria-invalid={Boolean(error)} aria-describedby={message ? `${id}-message` : undefined}>
            <option value="">{isPending ? "در حال دریافت شهرها…" : "انتخاب شهر"}</option>
            {cities.map((city) => <option key={city.id} value={String(city.id)}>{city.name} — {city.province_name}</option>)}
        </select>
        {message && <span id={`${id}-message`} role="status">{message}</span>}
        {isError && <button type="button" onClick={() => refetch()}>تلاش دوباره</button>}
    </>;
}
