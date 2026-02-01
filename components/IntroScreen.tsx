
import React, { useEffect, useRef, useState } from 'react';
import { Share2, ArrowRight, Smartphone } from 'lucide-react';

interface IntroScreenProps {
  onGetStarted: () => void;
  onJoinFamily: (code: string) => void;
}

const IntroScreen: React.FC<IntroScreenProps> = ({ onGetStarted, onJoinFamily }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let particles: Particle[] = [];
    let animationFrameId: number;
    
    const particleCount = 85;
    const maxDistance = 140;

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      hue: number;

      constructor() {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.5 + 0.5;
        this.hue = Math.random() > 0.5 ? 0 : 45; 
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x < 0 || this.x > w) this.vx *= -1;
        if (this.y < 0 || this.y > h) this.vy *= -1;
      }

      draw() {
        if (!ctx) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        const color = this.hue === 0 ? 'rgba(153, 0, 0, 0.4)' : 'rgba(255, 204, 0, 0.3)';
        ctx.fillStyle = color;
        ctx.fill();
      }
    }

    function init() {
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    }

    function connect() {
      if (!ctx) return;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDistance) {
            const opacity = (1 - dist / maxDistance) * 0.12;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            
            const gradient = ctx.createLinearGradient(
              particles[i].x, particles[i].y,
              particles[j].x, particles[j].y
            );
            gradient.addColorStop(0, `rgba(153, 0, 0, ${opacity})`);
            gradient.addColorStop(1, `rgba(255, 204, 0, ${opacity})`);
            
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
    }

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      connect();
      animationFrameId = requestAnimationFrame(animate);
    }

    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      init();
    };

    window.addEventListener('resize', handleResize);
    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinFamily(joinCode.trim());
    }
  };

  return (
    <div className="intro-container">
      <style>{`
        .intro-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
          background: #0a0a0a;
          color: #ffffff;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        .noise {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0.03;
          z-index: 100;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E");
        }

        .intro-canvas {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .content {
          position: relative;
          z-index: 10;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        nav {
          padding: 2.8rem 4rem;
          display: flex;
          align-items: center;
        }

        .wordmark {
          font-size: 1.125rem;
          font-weight: 590;
          letter-spacing: -0.02em;
          color: #ffffff;
        }

        main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 4rem 8rem;
        }

        .hero {
          max-width: 980px;
        }

        .eyebrow {
          font-size: 1.0625rem;
          font-weight: 510;
          letter-spacing: 0.01em;
          color: #8b8b8b;
          margin-bottom: 1.5rem;
        }

        h1.intro-h1 {
          font-size: 6.5rem;
          font-weight: 700;
          letter-spacing: -0.04em;
          line-height: 0.95;
          margin-bottom: 2.25rem;
          color: #ffffff;
        }

        .split-line {
          display: flex;
          align-items: baseline;
          gap: 1.5rem;
        }

        .gradient-word {
          background: linear-gradient(92deg, #990000 0%, #FFCC00 55%, #FDB515 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .subhead {
          font-size: 1.5rem;
          font-weight: 440;
          line-height: 1.4;
          letter-spacing: -0.015em;
          color: #a3a3a3;
          margin-bottom: 4rem;
          max-width: 720px;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .cta {
          display: inline-block;
          padding: 0.9375rem 2.5rem;
          font-size: 1.0625rem;
          font-weight: 510;
          letter-spacing: -0.01em;
          background: #ffffff;
          color: #000000;
          border: none;
          border-radius: 980px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
          text-decoration: none;
        }

        .cta-secondary {
          background: rgba(255,255,255,0.05);
          color: #ffffff;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .cta::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #990000 0%, #FFCC00 50%, #FDB515 100%);
          opacity: 0;
          transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .cta span {
          position: relative;
          z-index: 1;
        }

        .cta:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px rgba(255, 204, 0, 0.2);
        }

        .cta:hover::before {
          opacity: 1;
        }

        .cta:hover span {
          color: #ffffff;
        }

        .cta:active {
          transform: translateY(0);
        }

        .join-form {
          margin-top: 2rem;
          animation: in-down 0.4s ease-out;
          max-width: 400px;
        }

        @keyframes in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .info-grid {
          position: absolute;
          bottom: 4rem;
          left: 4rem;
          right: 4rem;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 3rem;
        }

        .info-item {
          opacity: 0.6;
          transition: opacity 0.25s ease;
        }

        .info-item:hover {
          opacity: 1;
        }

        .info-label {
          font-size: 0.8125rem;
          font-weight: 510;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #666666;
          margin-bottom: 0.5rem;
        }

        .info-value {
          font-size: 1.125rem;
          font-weight: 480;
          letter-spacing: -0.015em;
          color: #ffffff;
        }

        @media (max-width: 1024px) {
          nav { padding: 2rem; }
          main { padding: 0 2rem 6rem; }
          h1.intro-h1 { font-size: 4.5rem; }
          .split-line { flex-direction: column; gap: 0; }
          .subhead { font-size: 1.25rem; }
          .info-grid { left: 2rem; right: 2rem; bottom: 2rem; grid-template-columns: 1fr; gap: 2rem; }
        }

        @media (max-width: 640px) {
          h1.intro-h1 { font-size: 3rem; }
          .eyebrow { font-size: 0.9375rem; }
          .subhead { font-size: 1.0625rem; margin-bottom: 3rem; }
          .info-grid { position: relative; bottom: auto; left: auto; right: auto; margin-top: 4rem; }
        }
      `}</style>
      <div className="noise"></div>
      <canvas ref={canvasRef} className="intro-canvas"></canvas>

      <div className="content">
        <nav>
          <div className="wordmark">HomeWork</div>
        </nav>

        <main>
          <div className="hero">
            <div className="eyebrow">Teaching value through effort</div>
            <h1 className="intro-h1">
              <div className="split-line">
                <span>You learn.</span>
              </div>
              <div className="split-line">
                <span className="gradient-word">You earn.</span>
              </div>
            </h1>
            <p className="subhead">
              Real skills start at home. Chores become paychecks. Grades set the rate. Time teaches the value.
            </p>
            
            <div className="actions">
              <button onClick={onGetStarted} className="cta"><span>Get Started</span></button>
              <button 
                onClick={() => setShowJoinForm(!showJoinForm)} 
                className="cta cta-secondary"
              >
                <span>Join Family</span>
              </button>
            </div>

            {showJoinForm && (
              <form onSubmit={handleJoin} className="join-form">
                <div className="relative group">
                  <input 
                    type="text" 
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Enter family sync code" 
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-white/20 outline-none focus:border-[#FFCC00]/40 transition-all"
                  />
                  <button 
                    type="submit"
                    className="absolute right-2 top-2 bottom-2 px-4 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all flex items-center justify-center"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <p className="mt-3 text-[0.75rem] text-white/30 flex items-center gap-2">
                  <Smartphone className="w-3 h-3" /> Get this code from your parent's phone settings
                </p>
              </form>
            )}
          </div>
        </main>

        <div className="info-grid">
          <div className="info-item">
            <div className="info-label">Concept</div>
            <div className="info-value">Grade-based earnings</div>
          </div>
          <div className="info-item">
            <div className="info-label">Method</div>
            <div className="info-value">Time-tracked chores</div>
          </div>
          <div className="info-item">
            <div className="info-label">Result</div>
            <div className="info-value">Financial literacy</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroScreen;
