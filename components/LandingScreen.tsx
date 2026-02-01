
import React, { useEffect, useRef } from 'react';
import { Child } from '../types';

interface LandingScreenProps {
  childrenData: Child[];
  onSelectChild: (childId: string) => void;
  onSelectParent: () => void;
}

const LandingScreen: React.FC<LandingScreenProps> = ({ childrenData, onSelectChild, onSelectParent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    let particles: Particle[] = [];
    let animationFrameId: number;
    
    const particleCount = 65;
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
        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;
        this.radius = Math.random() * 1.2 + 0.4;
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
        const color = this.hue === 0 ? 'rgba(153, 0, 0, 0.35)' : 'rgba(255, 204, 0, 0.25)';
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
            const opacity = (1 - dist / maxDistance) * 0.1;
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

  return (
    <div className="landing-wrapper">
       <style>{`
        .landing-wrapper {
            font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            overflow-x: hidden;
            -webkit-font-smoothing: antialiased;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 50;
        }

        .noise {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            opacity: 0.03;
            z-index: 1001;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E");
        }

        canvas {
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
            flex: 1;
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
            padding: 0 2rem 4rem;
        }

        .profile-container {
            text-align: center;
            max-width: 600px;
            width: 100%;
        }

        h1 {
            font-size: 3.5rem;
            font-weight: 590;
            letter-spacing: -0.03em;
            margin-bottom: 0.75rem;
            color: #ffffff;
        }

        .subtitle {
            font-size: 1.125rem;
            font-weight: 440;
            letter-spacing: -0.01em;
            color: #666666;
            margin-bottom: 4rem;
        }

        .profiles {
            display: flex;
            justify-content: center;
            gap: 2.5rem;
            flex-wrap: wrap;
        }

        .profile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1.25rem;
            cursor: pointer;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            background: none;
            border: none;
            padding: 0;
            outline: none;
        }

        .profile:hover {
            transform: translateY(-8px);
        }

        .profile-avatar {
            width: 140px;
            height: 140px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 3.5rem;
            font-weight: 510;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }

        .profile-avatar::before {
            content: '';
            position: absolute;
            inset: -3px;
            border-radius: 50%;
            padding: 3px;
            background: linear-gradient(135deg, #990000, #FFCC00);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0;
            transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .profile:hover .profile-avatar::before {
            opacity: 1;
        }

        .profile-avatar.kid {
            background: rgba(255, 255, 255, 0.04);
            border: 2px solid rgba(255, 255, 255, 0.08);
            color: #ffffff;
        }

        .profile:hover .profile-avatar.kid {
            background: rgba(255, 255, 255, 0.06);
            border-color: rgba(255, 204, 0, 0.3);
            box-shadow: 0 20px 40px rgba(255, 204, 0, 0.15);
        }

        .profile-avatar.parent {
            background: #990000;
            border: 2px solid #990000;
            color: #ffffff;
        }

        .profile:hover .profile-avatar.parent {
            background: #b30000;
            box-shadow: 0 20px 40px rgba(153, 0, 0, 0.4);
        }

        .profile-avatar svg {
            width: 56px;
            height: 56px;
        }

        .profile-name {
            font-size: 1.25rem;
            font-weight: 510;
            letter-spacing: -0.015em;
            color: #ffffff;
        }

        .profile-role {
            font-size: 0.875rem;
            font-weight: 440;
            letter-spacing: 0.02em;
            text-transform: uppercase;
            color: #666666;
            margin-top: -0.5rem;
        }

        @media (max-width: 768px) {
            nav {
                padding: 2rem;
            }

            h1 {
                font-size: 2.5rem;
            }

            .subtitle {
                font-size: 1rem;
                margin-bottom: 3rem;
            }

            .profiles {
                gap: 2rem;
            }

            .profile-avatar {
                width: 120px;
                height: 120px;
                font-size: 3rem;
            }

            .profile-avatar svg {
                width: 48px;
                height: 48px;
            }
        }

        @media (max-width: 480px) {
            h1 {
                font-size: 2rem;
            }

            .profiles {
                flex-direction: column;
                align-items: center;
            }
        }
       `}</style>
      
      <div className="noise"></div>
      <canvas ref={canvasRef}></canvas>

      <div className="content">
        <nav>
          <div className="wordmark">HomeWork</div>
        </nav>

        <main>
          <div className="profile-container animate-in fade-in slide-in-from-bottom-8 duration-700">
             <h1>Who's here?</h1>
             <p className="subtitle">Select your profile to continue</p>

             <div className="profiles">
                {/* Children Profiles */}
                {childrenData.map(child => (
                   <button
                     key={child.id}
                     onClick={() => onSelectChild(child.id)}
                     className="profile"
                     type="button"
                   >
                       <div className="profile-avatar kid">
                          {child.name.substring(0, 1)}
                       </div>
                       <div className="profile-name">{child.name}</div>
                   </button>
                ))}

                {/* Parent Profile */}
                <button
                  onClick={onSelectParent}
                  className="profile"
                  type="button"
                >
                   <div className="profile-avatar parent">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="7" width="18" height="13" rx="2" ry="2"></rect>
                          <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                   </div>
                   <div className="profile-name">Parent</div>
                   <div className="profile-role">Admin</div>
                </button>
             </div>
          </div>
        </main>
      </div>

    </div>
  );
};

export default LandingScreen;
