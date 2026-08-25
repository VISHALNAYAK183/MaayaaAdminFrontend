import Input from "../form/input/InputField";
import Label from "../form/Label";

/**
 * Six-digit TOTP field. Strips anything non-numeric as the admin types, so a
 * pasted "123 456" still submits cleanly.
 */
export default function CodeInput({
  value,
  onChange,
  error,
  disabled,
  label = "Authentication code",
}: {
  value: string;
  onChange: (next: string) => void;
  error?: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <div>
      <Label htmlFor="code">{label}</Label>
      <Input
        id="code"
        name="code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        placeholder="000000"
        value={value}
        error={error}
        disabled={disabled}
        className="text-center text-lg tracking-[0.5em]"
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      />
    </div>
  );
}
