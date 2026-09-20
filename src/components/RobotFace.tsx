import { useEffect, useRef } from 'react';
import { expressions, type Expression } from '../domain/expressions';
import { drawFace } from '../scene/faceDrawing';

export function RobotFace({ expression }: { expression: Expression }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = canvas.current!.getContext('2d');
    if (!ctx) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    let last = -Infinity;
    const render = (now: number) => {
      if (now - last >= 50) {
        drawFace(ctx, expression, motion.matches ? 0 : now / 1000);
        last = now;
      }
      if (!motion.matches) frame = requestAnimationFrame(render);
    };
    const restart = () => {
      cancelAnimationFrame(frame);
      last = -Infinity;
      render(performance.now());
    };
    restart();
    motion.addEventListener('change', restart);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', restart);
    };
  }, [expression]);
  return (
    <canvas
      ref={canvas}
      width={800}
      height={400}
      className="robot-face"
      role="img"
      aria-label={`Khuôn mặt robot: ${expressions[expression].label}`}
      data-expression={expression}
    />
  );
}
