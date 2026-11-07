import { AccountInput } from './PublicAccountUi';

export function BirthDateField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const today = new Date();
  const maxDate = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  return (
    <AccountInput
      label="Data de nascimento"
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      max={maxDate}
      required
      autoComplete="bday"
    />
  );
}
