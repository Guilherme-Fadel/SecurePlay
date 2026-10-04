import { Children, Fragment, isValidElement, useEffect, useId, useRef, useState } from 'react';
import type { ComponentProps, KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { value: string; label: string; disabled: boolean };
type AppSelectProps = Omit<ComponentProps<'select'>, 'onFocus' | 'onBlur'> & Pick<ComponentProps<'button'>, 'onFocus' | 'onBlur'>;

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child): Option[] => {
    if (!isValidElement(child)) return [];
    if (child.type === Fragment) return readOptions((child.props as { children?: ReactNode }).children);
    if (child.type !== 'option') return [];
    const props = child.props as ComponentProps<'option'>;
    return [{ value: String(props.value ?? props.children ?? ''), label: String(props.label ?? props.children ?? ''), disabled: !!props.disabled }];
  });
}

export function AppSelect({ className, children, disabled, value, defaultValue, onChange, onFocus, onBlur, id, title, required, ...props }: AppSelectProps) {
  const options = readOptions(children);
  const [internalValue, setInternalValue] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const selectedValue = String(value ?? internalValue);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === selectedValue));
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const [inferredLabel, setInferredLabel] = useState('Selecionar opção');
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0, maxHeight: 240 });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef(false);
  const searchRef = useRef({ text: '', time: 0 });
  const listId = useId();

  useEffect(() => {
    const label = wrapperRef.current?.closest('label');
    const text = Array.from(label?.childNodes ?? []).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent?.trim()).filter(Boolean).join(' ');
    if (text) setInferredLabel(text);
  }, []);

  useEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const roomBelow = window.innerHeight - rect.bottom - 8;
      const menuHeight = Math.min(240, options.length * 34 + 8);
      const above = roomBelow < Math.min(menuHeight, 140) && rect.top > roomBelow;
      const available = above ? rect.top - 12 : roomBelow;
      const menuWidth = Math.min(Math.max(rect.width, 190), window.innerWidth - 16);
      setPosition({
        top: above ? Math.max(8, rect.top - Math.min(menuHeight, available) - 4) : rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
        width: menuWidth,
        maxHeight: Math.max(80, Math.min(240, available)),
      });
    };
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!wrapperRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    updatePosition();
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (open) menuRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    const select = selectRef.current;
    if (select && select.value !== option.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
      setter?.call(select, option.value);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    setInternalValue(option.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const move = (direction: number) => {
    if (!options.length) return;
    let next = activeIndex;
    for (let count = 0; count < options.length; count += 1) {
      next = (next + direction + options.length) % options.length;
      if (!options[next].disabled) { setActiveIndex(next); break; }
    }
  };

  const jumpToEdge = (last: boolean) => {
    const indexes = options.map((_, index) => index);
    if (last) indexes.reverse();
    const index = indexes.find((candidate) => !options[candidate].disabled);
    if (index !== undefined) setActiveIndex(index);
  };

  const searchByText = (key: string) => {
    const now = Date.now();
    const text = now - searchRef.current.time < 700 ? searchRef.current.text + key.toLocaleLowerCase() : key.toLocaleLowerCase();
    searchRef.current = { text, time: now };
    const index = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(text));
    if (index >= 0) { setActiveIndex(index); setOpen(true); }
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'Escape': setOpen(false); return;
      case 'Tab': setOpen(false); return;
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        if (open) move(event.key === 'ArrowDown' ? 1 : -1);
        else { setActiveIndex(selectedIndex); setOpen(true); }
        return;
      case 'Home':
        if (open) { event.preventDefault(); jumpToEdge(false); }
        return;
      case 'End':
        if (open) { event.preventDefault(); jumpToEdge(true); }
        return;
      case 'Enter':
      case ' ':
        if (open) { event.preventDefault(); choose(activeIndex); }
        return;
      default:
        if (event.key.length === 1 && !event.altKey && !event.ctrlKey && !event.metaKey) searchByText(event.key);
    }
  };

  return <div ref={wrapperRef} className={cn('app-filter-select', 'app-select-wrap', disabled && 'is-disabled', className)} aria-invalid={props['aria-invalid']}>
    <button ref={buttonRef} id={id} title={title} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined} aria-label={props['aria-label'] ?? inferredLabel} aria-labelledby={props['aria-labelledby']} aria-describedby={props['aria-describedby']} aria-invalid={props['aria-invalid']} aria-required={required || undefined} disabled={disabled}
      onClick={() => { setActiveIndex(selectedIndex); setOpen((current) => !current); }}
      onKeyDown={handleKeyDown} onFocus={onFocus} onBlur={(event) => { if (!selectingRef.current) setOpen(false); onBlur?.(event); }}>
      <span>{options[selectedIndex]?.label ?? ''}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    <select ref={selectRef} className="app-select-native" tabIndex={-1} aria-hidden="true" disabled={disabled} required={required} value={value} defaultValue={defaultValue} onChange={onChange} {...props}>{children}</select>
    {open && createPortal(<div ref={menuRef} id={listId} className="app-select-menu" role="listbox" aria-label={props['aria-label'] ?? inferredLabel} onPointerDown={() => { selectingRef.current = true; }} onPointerUp={() => { selectingRef.current = false; }} onPointerCancel={() => { selectingRef.current = false; }} style={{ top: position.top, left: position.left, width: position.width, maxHeight: position.maxHeight }}>
      {options.map((option, index) => <div key={`${option.value}-${index}`} id={`${listId}-${index}`} role="option" aria-selected={index === selectedIndex} aria-disabled={option.disabled || undefined} className={cn('app-select-option', index === selectedIndex && 'is-current', index === activeIndex && 'is-active')} onMouseEnter={() => { if (!option.disabled) setActiveIndex(index); }} onClick={() => choose(index)}>
        <span>{option.label}</span>{index === selectedIndex && <Check size={16} aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </div>;
}
