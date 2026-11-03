export function publicPhones(value: string): {label: string; number: string}[] {
  return value.split(/\s*[-،,;؛\n]\s*/).map(label => {
    const normalized = label.replace(/[۰-۹]/g, digit => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, digit => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    return {label: label.trim(), number: normalized.replace(/[^\d+]/g, "")};
  }).filter(item => /^\+?\d{7,15}$/.test(item.number));
}
