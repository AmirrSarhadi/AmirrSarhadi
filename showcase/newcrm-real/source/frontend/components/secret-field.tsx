"use client";

import {useState, type InputHTMLAttributes, type Ref} from "react";
import {Eye, EyeOff} from "lucide-react";

type SecretFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "id"> & {
  id: string; label: string; error?: string; hint?: string; inputRef?: Ref<HTMLInputElement>;
};

export function SecretField({id, label, error, hint, inputRef, disabled, ...props}: SecretFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  return <div className="account-field">
    <label htmlFor={id}>{label}</label>
    <div className="secret-field">
      <input {...props} ref={inputRef} id={id} type={showSecret ? "text" : "password"} dir="ltr" disabled={disabled}
        aria-invalid={!!error} aria-describedby={`${id}-error${hint ? ` ${id}-hint` : ""}`}/>
      <button type="button" className="reveal-secret" disabled={disabled} aria-label={`${showSecret ? "پنهان کردن" : "نمایش"} ${label}`}
        aria-pressed={showSecret} onClick={() => setShowSecret(value => !value)}>
        {showSecret ? <EyeOff size={19} aria-hidden="true"/> : <Eye size={19} aria-hidden="true"/>}
      </button>
    </div>
    {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    <p className="field-error" id={`${id}-error`}>{error || "\u00a0"}</p>
  </div>;
}
