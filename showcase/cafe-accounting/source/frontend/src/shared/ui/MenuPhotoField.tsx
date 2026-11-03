import { useEffect, useId, useState } from "react";

export function MenuPhotoField({ current }: { current?: string | null }) {
  const id = useId();
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <div className="menu-photo-field"><label htmlFor={id}>عکس آیتم (اختیاری)</label>
    <input id={id} name="image" type="file" accept="image/jpeg,image/png,image/webp" aria-invalid={!!error} aria-describedby={`${id}-help`} onChange={(event) => {
      const next = event.target.files?.[0];
      setError(""); setPreview(""); event.target.setCustomValidity("");
      if (!next) return;
      if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 5 * 1024 * 1024 || !next.size) {
        setError("یک عکس JPEG، PNG یا WebP با حجم حداکثر ۵ مگابایت انتخاب کنید."); event.target.setCustomValidity("عکس معتبر انتخاب کنید."); event.target.value = ""; return;
      }
      setPreview(URL.createObjectURL(next));
    }} />
    <small id={`${id}-help`}>{error || "JPEG، PNG یا WebP · حداکثر ۵ مگابایت و ۱۶ مگاپیکسل"}</small>
    {(preview || current) && <img className="menu-photo-preview" src={preview || current || undefined} alt="پیش‌نمایش عکس آیتم" />}
  </div>;
}
