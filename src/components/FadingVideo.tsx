import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface FadingVideoProps {
  src: string | string[];
  className?: string;
  style?: CSSProperties;
}

const FADE_IN_MS = 500;
const FADE_OUT_MS = 550;
const FADE_OUT_THRESHOLD = 0.55;

export default function FadingVideo({ src, className, style }: FadingVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [opacity, setOpacity] = useState(0);
  const opacityRef = useRef(0);
  const indexRef = useRef(0);
  const fadingOutRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const sources = Array.isArray(src) ? src : [src];

  const setOp = (v: number) => {
    opacityRef.current = v;
    setOpacity(v);
  };

  const animateOpacity = (from: number, to: number, duration: number, onDone?: () => void) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const step = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const value = from + (to - from) * t;
      setOp(value);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    fadingOutRef.current = false;
    setOp(0);

    const handleLoadedData = () => {
      animateOpacity(opacityRef.current, 1, FADE_IN_MS);
    };

    const handleTimeUpdate = () => {
      if (!video.duration || isNaN(video.duration)) return;
      const remaining = video.duration - video.currentTime;
      if (remaining <= FADE_OUT_THRESHOLD && !fadingOutRef.current) {
        fadingOutRef.current = true;
        animateOpacity(opacityRef.current, 0, FADE_OUT_MS);
      }
    };

    const handleEnded = () => {
      fadingOutRef.current = false;
      if (sources.length > 1) {
        indexRef.current = (indexRef.current + 1) % sources.length;
        video.src = sources[indexRef.current];
        video.load();
        video.play().catch(() => {});
      } else {
        video.currentTime = 0;
        video.play().catch(() => {});
        animateOpacity(opacityRef.current, 1, FADE_IN_MS);
      }
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('ended', handleEnded);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <video
      ref={videoRef}
      className={className}
      style={{ ...style, opacity, transition: 'none' }}
      src={sources[0]}
      autoPlay
      muted
      playsInline
      preload="auto"
    />
  );
}
