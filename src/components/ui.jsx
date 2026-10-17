import React, { useEffect, useId, useRef } from 'react';

export function Button({ variant = 'secondary', className = '', children, type = 'button', ...props }) {
  return <button type={type} className={`button ${variant} ${className}`.trim()} {...props}>{children}</button>;
}

export function Dialog({ open = true, title, subtitle, children, footer, onClose, size = 'medium', dismissible = true, onInteract, headerActions }) {
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const programmaticCloses = useRef(0);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    dialog.showModal();
    titleRef.current.focus({ preventScroll: true });
    return () => {
      if (dialog.open) {
        programmaticCloses.current += 1;
        dialog.close();
      }
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  function interact(event) {
    if (event.target.closest('[data-keep-playing]')) return;
    onInteract?.();
  }

  function handleKeyDown(event) {
    if (event.key === 'Tab') onInteract?.();
    else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) interact(event);
  }

  return (
    <dialog
      ref={dialogRef}
      className={`dialog dialog-${size}`}
      aria-labelledby={titleId}
      aria-describedby={subtitle ? subtitleId : undefined}
      onKeyDown={handleKeyDown}
      onClose={() => {
        if (programmaticCloses.current > 0) programmaticCloses.current -= 1;
        else if (dismissible) onClose?.();
      }}
      onCancel={event => {
        event.preventDefault();
        if (dismissible) onClose?.();
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-header">
          <div className="dialog-heading">
            <h2 ref={titleRef} id={titleId} tabIndex={-1}>{title}</h2>
            {subtitle && <p id={subtitleId} className="dialog-subtitle">{subtitle}</p>}
          </div>
          <div className="dialog-header-actions">
            {headerActions}
            {dismissible && <Button variant="ghost" className="dialog-close" onClick={onClose} aria-label="閉じる">閉じる <span aria-hidden="true">×</span></Button>}
          </div>
        </header>
        <div className="dialog-body" onPointerDown={interact}>{children}</div>
        {footer && <footer className="dialog-footer">{footer}</footer>}
      </div>
    </dialog>
  );
}

export function Section({ title, children, className = '' }) {
  const titleId = useId();
  return <section className={`detail-section ${className}`.trim()} aria-labelledby={title ? titleId : undefined}>
    {title && <h3 id={titleId}>{title}</h3>}
    {children}
  </section>;
}

export function ChoiceCard({ title, description, cost, selected = false, disabled = false, immediate = false, onChoose, children }) {
  return <article className={`choice-card${selected ? ' selected' : ''}${immediate ? ' immediate' : ''}${disabled ? ' unavailable' : ''}`}>
    <button type="button" className="choice-main" aria-pressed={immediate ? undefined : selected} disabled={disabled} onClick={onChoose}>
      <span className="choice-heading">
        <span className="choice-mark" aria-hidden="true">{immediate ? '↗' : selected ? '●' : '○'}</span>
        <strong>{title}</strong>
      </span>
      {cost != null && <span className="choice-cost">{cost}</span>}
      {description && <span className="choice-description">{description}</span>}
      {immediate && <span className="choice-mode">すぐに返答する <span aria-hidden="true">→</span></span>}
    </button>
    {children && <div className="choice-detail">{children}</div>}
  </article>;
}

export function SpeedControls({ speed, onChange }) {
  return <div className="speed-switch" role="group" aria-label="時間の速さ">
    {[0.125, 0.25, 0.5, 1, 2].map(value => <Button key={value} aria-pressed={speed === value} aria-label={`時間の速さ ${value / 0.25}倍`} onClick={() => onChange(value)} data-keep-playing>{value / 0.25}×</Button>)}
  </div>;
}
