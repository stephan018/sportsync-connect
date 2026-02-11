import { useState, useEffect } from 'react';
import eagleLogo from '@/assets/eagle-only.svg';

const SPLASH_KEY = 'acex_splash_shown';

export default function SplashScreen() {
  const [visible, setVisible] = useState(() => {
    return !sessionStorage.getItem(SPLASH_KEY);
  });
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setExiting(true);
      sessionStorage.setItem(SPLASH_KEY, '1');
    }, 1500);

    return () => clearTimeout(timer);
  }, [visible]);

  useEffect(() => {
    if (!exiting) return;
    const timer = setTimeout(() => setVisible(false), 500);
    return () => clearTimeout(timer);
  }, [exiting]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background transition-all duration-500 ${
        exiting ? 'opacity-0 -translate-y-full' : 'opacity-100 translate-y-0'
      }`}
    >
      <div className="flex flex-col items-center gap-4 animate-pulse-soft">
        <img
          src={eagleLogo}
          alt="AceX"
          className="h-28 w-auto drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]"
        />
        <span className="font-brand font-bold uppercase tracking-wide text-4xl text-primary">
          AceX
        </span>
      </div>
    </div>
  );
}
