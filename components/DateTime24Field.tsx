"use client";

type DateTime24FieldProps = {
  label?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
};

export function DateTime24Field({ label, name, value, onChange, disabled, required }: DateTime24FieldProps) {
  const [date = "", time = ""] = value.split("T");
  const [hour = "", minute = ""] = time.split(":");
  const update = (nextDate: string, nextTime: string) => onChange(`${nextDate}T${nextTime}`);
  const fieldRequired = Boolean(required || (value && value !== "T"));

  return (
    <>
      {label && <span className="block">{label}</span>}
      {name && <input type="hidden" name={name} value={value} />}
      <span className="mt-2 grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] gap-2">
        <input aria-label={label ? `${label} date` : "Date"} type="date" value={date} required={fieldRequired} disabled={disabled} onChange={(event) => update(event.target.value, time)} />
        <select aria-label={label ? `${label} hour (24-hour)` : "Hour (24-hour)"} value={hour} required={fieldRequired} disabled={disabled} onChange={(event) => update(date, `${event.target.value}:${minute}`)}>
          <option value="">HH</option>
          {Array.from({ length: 24 }, (_, n) => String(n).padStart(2, "0")).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <select aria-label={label ? `${label} minute` : "Minute"} value={minute} required={fieldRequired} disabled={disabled} onChange={(event) => update(date, `${hour}:${event.target.value}`)}>
          <option value="">mm</option>
          {Array.from({ length: 60 }, (_, n) => String(n).padStart(2, "0")).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </span>
      <span className="mt-1 block text-[10px] font-normal text-muted">24-hour time (00–23)</span>
    </>
  );
}
