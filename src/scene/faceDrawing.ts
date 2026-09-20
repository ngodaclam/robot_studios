import { expressions, type Expression } from '../domain/expressions';

// Shared artwork for the phone texture and the full-size browser display.
export function drawFace(ctx: CanvasRenderingContext2D, expression: Expression, time = 0) {
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#07151e';
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  const scale = Math.min(width / 800, height / 400);
  ctx.translate(width / 2, height / 2);
  ctx.scale(scale, scale);
  const color = expressions[expression].color;
  const glow = ctx.createRadialGradient(0, 20, 5, 0, 20, 360);
  glow.addColorStop(0, `${color}12`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.fillRect(-400, -200, 800, 400);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = `${color}70`;
  ctx.shadowBlur = 18;
  const phase = time % 5.4;
  const blink = phase > 4.9 && phase < 5.1 ? Math.abs(phase - 5) * 10 : 1;
  const gaze = expression === 'curious' ? Math.sin(time * 0.7) * 13 : Math.sin(time * 0.5) * 4;
  for (const side of [-1, 1]) {
    const x = side * 126 + gaze;
    ctx.save();
    ctx.translate(x, -34);
    ctx.scale(1, expression === 'sleepy' ? 1 : Math.max(0.07, blink));
    ctx.beginPath();
    if (expression === 'happy') {
      ctx.moveTo(-39, 10);
      ctx.quadraticCurveTo(0, -53, 39, 10);
      ctx.stroke();
    } else if (expression === 'sleepy') {
      ctx.moveTo(-38, 9);
      ctx.quadraticCurveTo(0, 28, 38, 9);
      ctx.stroke();
    } else if (expression === 'sad') {
      ctx.ellipse(0, 9, 29, 19, side * -0.23, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-34, -17 + side * 12);
      ctx.lineTo(34, -17 - side * 12);
      ctx.lineWidth = 7;
      ctx.stroke();
    } else {
      const eyeHeight =
        expression === 'surprised' ? 51 : expression === 'curious' && side === 1 ? 47 : 34;
      ctx.roundRect(-30, -eyeHeight, 60, eyeHeight * 2, 24);
      ctx.fill();
      if (expression === 'alert') {
        ctx.beginPath();
        ctx.moveTo(-32, -56 - side * 10);
        ctx.lineTo(32, -56 + side * 10);
        ctx.lineWidth = 7;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  ctx.beginPath();
  ctx.lineWidth = 9;
  if (expression === 'surprised') {
    ctx.ellipse(0, 77, 22, 29, 0, 0, Math.PI * 2);
  } else if (expression === 'sleepy') {
    ctx.ellipse(0, 74, 12, 9 + Math.sin(time * 1.5) * 2, 0, 0, Math.PI * 2);
  } else {
    const y = expression === 'sad' ? 90 : 64;
    ctx.moveTo(-39, y);
    ctx.quadraticCurveTo(0, expression === 'sad' ? 56 : expression === 'alert' ? 64 : 105, 39, y);
  }
  ctx.stroke();
  if (expression === 'happy') {
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ee8e9b66';
    for (const x of [-188, 188]) {
      ctx.beginPath();
      ctx.ellipse(x, 44, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (expression === 'sleepy') {
    ctx.font = '500 26px sans-serif';
    ctx.fillText('z', 199, -65 - Math.sin(time) * 4);
    ctx.font = '500 19px sans-serif';
    ctx.fillText('z', 225, -95 - Math.sin(time) * 4);
  }
  ctx.restore();
}
