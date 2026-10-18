import React, { useEffect, useState } from 'react';
import styles from './Progress.module.css';

export function Progress({ clock, label }) {
  const [progress, setProgress] = useState(clock.progress);
  const running = clock.running;
  useEffect(() => {
    let frame;
    const draw = () => {
      setProgress(clock.progress);
      if (clock.running) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [clock, running, clock.generation]);
  return <div className={styles['progress-track']} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span className={styles['progress-fill']} style={{ transform: `scaleX(${progress})` }} /></div>;
}

