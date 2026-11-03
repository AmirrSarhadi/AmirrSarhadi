import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";
import persian from "react-date-object/calendars/persian";
import gregorian from "react-date-object/calendars/gregorian";
import persianFa from "react-date-object/locales/persian_fa";
import gregorianEn from "react-date-object/locales/gregorian_en";

export default function PersianDateInput({ id, value, onChange, required = false, disabled = false }) {
  const selected = value ? new DateObject({ date: value, format: "YYYY-MM-DD", calendar: gregorian }).convert(persian, persianFa) : null;
  return <DatePicker id={id} value={selected} calendar={persian} locale={persianFa} format="YYYY/MM/DD"
    calendarPosition="bottom-right" containerStyle={{ width: "100%" }} required={required} disabled={disabled}
    editable={false} placeholder="انتخاب تاریخ شمسی"
    onChange={(date) => onChange(date ? new DateObject(date).convert(gregorian, gregorianEn).format("YYYY-MM-DD") : "")} />;
}
