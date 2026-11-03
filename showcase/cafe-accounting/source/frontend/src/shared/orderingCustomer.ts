import { OrderingCustomer } from "./api";

export const emptyOrderingCustomer: OrderingCustomer = { last_name: "", phone: "" };
export function clearEditedCustomerErrors(errors: Record<string, string>, previous: OrderingCustomer, next: OrderingCustomer) {
  const remaining = { ...errors };
  if (previous.last_name !== next.last_name) delete remaining.last_name;
  if (previous.phone !== next.phone) delete remaining.phone;
  return remaining;
}
export function normalizeContact(phone: string) {
  return phone.trim().replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit))).replace(/[\s-]/g, "");
}
export function orderingCustomerErrors(customer: OrderingCustomer, required: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  const phone = normalizeContact(customer.phone);
  const needsContact = required || !!phone || !!customer.last_name.trim();
  if (needsContact && !phone) errors.phone = "شماره تماس سفارش‌دهنده الزامی است.";
  else if (phone && !/^09[0-9]{9}$/.test(phone)) errors.phone = "شماره تماس باید با ۰۹ شروع و ۱۱ رقم باشد.";
  if (!errors.phone && needsContact && !customer.last_name.trim()) errors.last_name = "نام خانوادگی سفارش‌دهنده الزامی است.";
  if (customer.last_name.trim().length > 100) errors.last_name = "نام خانوادگی نمی‌تواند بیشتر از ۱۰۰ حرف باشد.";
  return errors;
}
export function orderingTableLabel(label: string) {
  const match = /^(?:میز\s*(?:شماره\s*)?)?([0-9۰-۹٠-٩]+)$/.exec(label.trim());
  if (!match) return label;
  const digits = normalizeContact(match[1]).replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
  return `میز شماره ${digits}`;
}
