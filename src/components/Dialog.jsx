import React, { useEffect, useId, useRef } from 'react';
import styles from './Dialog.module.css';
import { Button } from './Button.jsx';

export function Dialog({ open = true, title, subtitle, children, footer, onClose, size = 'medium', dismissible = true, onInteract, headerActions, notification }) {
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
      className={`${styles['dialog']} ${size === 'medium' ? '' : styles[`dialog-${size}`]}`}
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
      <div className={styles['dialog-shell']}>
        <header className={styles['dialog-header']}>
          <div className={styles['dialog-heading']}>
            <h2 ref={titleRef} id={titleId} tabIndex={-1}>{title}</h2>
            {subtitle && <p id={subtitleId} className={styles['dialog-subtitle']}>{subtitle}</p>}
          </div>
          <div className={styles['dialog-header-actions']}>
            {headerActions}
            {dismissible && <Button variant="ghost" className={styles['dialog-close']} onClick={onClose} aria-label="閉じる">閉じる <span aria-hidden="true">×</span></Button>}
          </div>
        </header>
        <div className={styles['dialog-notification']}>{notification}</div>
        <div className={styles['dialog-body']} onPointerDown={interact}>{children}</div>
        {footer && <footer className={styles['dialog-footer']}>{footer}</footer>}
      </div>
    </dialog>
  );
}
