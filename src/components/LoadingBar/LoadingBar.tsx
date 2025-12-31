import styles from './LoadingBar.module.scss';

interface LoadingBarProps {
  progress: number;
  color?: 'blue' | 'green';
}

export function LoadingBar({ progress, color = 'blue' }: LoadingBarProps) {
  if (progress <= 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div
        className={`${styles.bar} ${styles[color]}`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
