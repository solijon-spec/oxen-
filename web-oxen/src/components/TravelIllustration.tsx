import { useEffect, useRef } from "react";

export default function TravelIllustration() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let time = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    // Airplane path
    const airplanePath: { angle: number; radius: number; speed: number; size: number } = {
      angle: 0,
      radius: 0,
      speed: 0.4,
      size: 0,
    };

    // Floating particles
    const particles: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number; phase: number }> = [];

    const drawGlobe = (cx: number, cy: number, r: number, t: number) => {
      // Globe shadow/glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.7, cx, cy, r * 1.6);
      glow.addColorStop(0, "rgba(59, 130, 246, 0.25)");
      glow.addColorStop(0.5, "rgba(37, 99, 235, 0.08)");
      glow.addColorStop(1, "rgba(30, 58, 138, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Globe body
      const body = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.3, r * 0.05, cx, cy, r);
      body.addColorStop(0, "#60a5fa");
      body.addColorStop(0.35, "#3b82f6");
      body.addColorStop(0.7, "#1d4ed8");
      body.addColorStop(1, "#1e3a5f");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Continents (stylized shapes)
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();

      ctx.fillStyle = "rgba(147, 197, 253, 0.35)";
      // North America
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.45, cy - r * 0.35, r * 0.28, r * 0.42, -0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.55, cy - r * 0.15, r * 0.12, r * 0.2, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // South America
      ctx.beginPath();
      ctx.ellipse(cx - r * 0.38, cy + r * 0.3, r * 0.12, r * 0.3, 0.15, 0, Math.PI * 2);
      ctx.fill();

      // Europe
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.05, cy - r * 0.38, r * 0.22, r * 0.18, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Africa
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.05, cy + r * 0.15, r * 0.2, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Asia
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.4, cy - r * 0.1, r * 0.35, r * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();

      // Australia
      ctx.beginPath();
      ctx.ellipse(cx + r * 0.5, cy + r * 0.4, r * 0.1, r * 0.14, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Grid lines
      ctx.strokeStyle = "rgba(147, 197, 253, 0.12)";
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.3, r, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.stroke();

      // Glass rim
      const rim = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
      rim.addColorStop(0, "rgba(255,255,255,0.15)");
      rim.addColorStop(0.5, "rgba(255,255,255,0.02)");
      rim.addColorStop(1, "rgba(255,255,255,0.06)");
      ctx.strokeStyle = rim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawAirplane = (cx: number, cy: number, angle: number, size: number) => {
      const x = cx + Math.cos(angle) * airplanePath.radius;
      const y = cy + Math.sin(angle) * airplanePath.radius * 0.55;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      // Airplane body
      ctx.fillStyle = "#f1f5f9";
      ctx.beginPath();
      ctx.moveTo(0, -size * 1.2);
      ctx.lineTo(size * 0.7, size * 0.6);
      ctx.lineTo(size * 0.15, size * 0.3);
      ctx.lineTo(-size * 0.15, size * 0.3);
      ctx.lineTo(-size * 0.7, size * 0.6);
      ctx.closePath();
      ctx.fill();

      // Wings
      ctx.fillStyle = "#e2e8f0";
      ctx.beginPath();
      ctx.moveTo(-size * 0.05, -size * 0.1);
      ctx.lineTo(-size * 1.5, size * 1.4);
      ctx.lineTo(size * 0.1, size * 0.9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(size * 0.05, -size * 0.1);
      ctx.lineTo(size * 1.5, size * 1.4);
      ctx.lineTo(-size * 0.1, size * 0.9);
      ctx.closePath();
      ctx.fill();

      // Trail
      ctx.strokeStyle = "rgba(147,197,253,0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, size * 1.2);
      ctx.lineTo(0, size * 1.2 + 20);
      ctx.stroke();

      ctx.restore();
    };

    const drawClouds = (w: number, h: number, t: number) => {
      const clouds = [
        { x: w * 0.15, y: h * 0.2, s: 1, sp: 0.15 },
        { x: w * 0.7, y: h * 0.1, s: 1.4, sp: 0.1 },
        { x: w * 0.5, y: h * 0.75, s: 1.1, sp: 0.12 },
        { x: w * 0.85, y: h * 0.55, s: 0.8, sp: 0.18 },
        { x: w * 0.3, y: h * 0.85, s: 1.3, sp: 0.08 },
      ];

      clouds.forEach((c) => {
        const cx = ((c.x + t * c.sp * 0.01) % 1.3) * w - w * 0.15;
        const cy = c.y;
        ctx.fillStyle = "rgba(255,255,255,0.07)";
        ctx.beginPath();
        ctx.ellipse(cx, cy, 35 * c.s, 14 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + 20 * c.s, cy - 6 * c.s, 25 * c.s, 12 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx - 18 * c.s, cy - 3 * c.s, 22 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawLocationPins = (cx: number, cy: number, r: number, t: number) => {
      const pins = [
        { a: -0.5, d: 0.7 },
        { a: 0.8, d: 0.6 },
        { a: 2.3, d: 0.65 },
        { a: 4.2, d: 0.75 },
      ];

      pins.forEach((p) => {
        const x = cx + Math.cos(p.a) * r * p.d;
        const y = cy + Math.sin(p.a) * r * p.d * 0.55;
        const pulse = Math.sin(t * 3 + p.a) * 0.5 + 0.5;

        // Pin glow
        ctx.fillStyle = `rgba(239, 68, 68, ${0.15 + pulse * 0.25})`;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();

        // Pin body
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Inner dot
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const drawMountains = (w: number, h: number, t: number) => {
      ctx.fillStyle = "rgba(147, 197, 253, 0.08)";
      const base = h * 0.85;
      // Mountain range
      const peaks = [
        { x: w * 0.08, h: 60 },
        { x: w * 0.2, h: 100 },
        { x: w * 0.35, h: 75 },
        { x: w * 0.5, h: 120 },
        { x: w * 0.65, h: 90 },
        { x: w * 0.8, h: 110 },
        { x: w * 0.92, h: 70 },
      ];
      peaks.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x - 30, base);
        ctx.lineTo(p.x, base - p.h);
        ctx.lineTo(p.x + 30, base);
        ctx.closePath();
        ctx.fill();
      });
      // Snow caps
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      peaks.forEach((p) => {
        ctx.beginPath();
        ctx.moveTo(p.x - 10, base - p.h + 18);
        ctx.lineTo(p.x, base - p.h);
        ctx.lineTo(p.x + 10, base - p.h + 18);
        ctx.closePath();
        ctx.fill();
      });
    };

    const initParticles = (w: number, h: number) => {
      particles.length = 0;
      for (let i = 0; i < 25; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3 - 0.1,
          alpha: Math.random() * 0.5 + 0.2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    initParticles(w, h);

    const loop = () => {
      const W = canvas.width / dpr;
      const H = canvas.height / dpr;
      time += 0.016;

      // Background gradient
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(0.4, "#0c1d4a");
      bg.addColorStop(0.7, "#081835");
      bg.addColorStop(1, "#061225");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 137.5) % W);
        const sy = ((i * 89.3) % H * 0.6);
        const twinkle = Math.sin(time * 2 + i) * 0.5 + 0.5;
        ctx.globalAlpha = 0.2 + twinkle * 0.5;
        ctx.beginPath();
        ctx.arc(sx, sy, (i % 3) * 0.5 + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const cx = W / 2;
      const cy = H * 0.38;
      const globeR = Math.min(W, H) * 0.24;

      airplanePath.radius = globeR * 1.25;
      airplanePath.size = globeR * 0.08;
      airplanePath.angle += airplanePath.speed * 0.016;

      drawClouds(W, H, time);
      drawMountains(W, H, time);
      drawGlobe(cx, cy, globeR, time);
      drawLocationPins(cx, cy, globeR, time);
      drawAirplane(cx, cy, airplanePath.angle, airplanePath.size);

      // Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;
        if (p.y < -10) p.y = H + 10;
        if (p.y > H + 10) p.y = -10;
        const a = Math.sin(time * 1.5 + p.phase) * 0.3 + 0.4;
        ctx.fillStyle = `rgba(147,197,253,${a})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animId = requestAnimationFrame(loop);
    };

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      style={{ display: "block" }}
    />
  );
}
