import { useId, useState } from 'react';
import { CircleHelp } from 'lucide-react';

interface AdminHelpTipProps {
  label: string;
  text: string;
}

export function AdminHelpTip({ label, text }: AdminHelpTipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className="admin-help-tip"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setOpen(false);
          event.stopPropagation();
        }
      }}
    >
      <button type="button" aria-label={`Ajuda sobre ${label}`} aria-describedby={open ? tooltipId : undefined} onClick={() => setOpen(true)}>
        <CircleHelp size={16} aria-hidden="true" />
      </button>
      <span className={`admin-help-tip-content${open ? ' is-open' : ''}`} id={tooltipId} role="tooltip">{text}</span>
    </span>
  );
}
