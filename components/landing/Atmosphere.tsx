'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, ISourceOptions } from '@tsparticles/engine';

export function LandingAtmosphere() {
  const [ready, setReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setReady(true);
    });
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  }, []);

  const options: ISourceOptions = useMemo(
    () => ({
      fullScreen: {
        enable: false,
      },
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: isMobile ? 24 : 50,
      detectRetina: !isMobile,
      particles: {
        number: {
          value: isMobile ? 14 : 72,
          density: {
            enable: true,
            area: isMobile ? 1800 : 1200,
          },
        },
        color: {
          value: '#5fe7ff',
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: isMobile ? { min: 0.08, max: 0.2 } : { min: 0.14, max: 0.42 },
        },
        size: {
          value: isMobile ? { min: 0.7, max: 1.8 } : { min: 1, max: 3.2 },
        },
        links: {
          enable: !isMobile,
          distance: 150,
          color: '#62e7ff',
          opacity: 0.3,
          width: 0.75,
        },
        move: {
          enable: true,
          speed: isMobile ? 0.18 : 0.5,
          direction: 'none',
          random: false,
          straight: false,
          outModes: {
            default: 'out',
          },
        },
      },
      interactivity: {
        events: {
          resize: {
            enable: !isMobile,
          },
        },
      },
    }),
    [isMobile],
  );

  const particlesLoaded = async (_container?: Container): Promise<void> => {
    return;
  };

  if (!ready) {
    return <div aria-hidden className="pointer-events-none absolute inset-0 z-[2]" />;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <div className="absolute -top-36 left-[-24%] h-[18rem] w-[18rem] rounded-full bg-[radial-gradient(circle,rgba(0,209,255,0.12),transparent_72%)] blur-3xl sm:-top-52 sm:left-[-16%] sm:h-[34rem] sm:w-[34rem] sm:bg-[radial-gradient(circle,rgba(0,209,255,0.18),transparent_72%)]" />
      <div className="absolute top-0 right-[-22%] h-[16rem] w-[16rem] rounded-full bg-[radial-gradient(circle,rgba(51,156,255,0.1),transparent_70%)] blur-3xl sm:right-[-16%] sm:h-[30rem] sm:w-[30rem] sm:bg-[radial-gradient(circle,rgba(51,156,255,0.14),transparent_70%)]" />
      <div className="absolute bottom-[-10rem] left-1/2 h-[12rem] w-[24rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,191,255,0.08),transparent_74%)] blur-3xl sm:bottom-[-16rem] sm:h-[26rem] sm:w-[56rem] sm:bg-[radial-gradient(circle,rgba(0,191,255,0.12),transparent_74%)]" />

      <Particles
        id="neural-network-bg"
        className="absolute inset-0"
        options={options}
        particlesLoaded={particlesLoaded}
      />

      <div className="cyber-scanline absolute inset-0 hidden sm:block" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(3,8,16,0.28)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.04),transparent_60%)] sm:bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.08),transparent_60%)]" />
    </div>
  );
}