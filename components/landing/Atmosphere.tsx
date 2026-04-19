'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, ISourceOptions } from '@tsparticles/engine';

export function LandingAtmosphere() {
  const [ready, setReady] = useState(false);
  const [lightMode, setLightMode] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluateLightMode = () => {
      const reducedMotion = media.matches;
      const lowCpu = typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4;
      const lowMemory =
        typeof (navigator as Navigator & { deviceMemory?: number }).deviceMemory === 'number' &&
        ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 0) <= 4;
      const mobileViewport = window.matchMedia('(max-width: 1024px)').matches;
      const mobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isMobile = mobileViewport || mobileUa;

      setLightMode(reducedMotion || lowCpu || lowMemory || isMobile);
    };

    evaluateLightMode();
    media.addEventListener('change', evaluateLightMode);

    return () => {
      media.removeEventListener('change', evaluateLightMode);
    };
  }, []);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setReady(true);
    });
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
      fpsLimit: lightMode ? 28 : 45,
      detectRetina: !lightMode,
      particles: {
        number: {
          value: lightMode ? 28 : 56,
          density: {
            enable: true,
            area: lightMode ? 1500 : 1200,
          },
        },
        color: {
          value: '#5fe7ff',
        },
        shape: {
          type: 'circle',
        },
        opacity: {
          value: { min: 0.14, max: 0.42 },
        },
        size: {
          value: { min: 0.8, max: lightMode ? 2.1 : 2.8 },
        },
        links: {
          enable: !lightMode,
          distance: 150,
          color: '#62e7ff',
          opacity: 0.3,
          width: 0.75,
        },
        move: {
          enable: true,
          speed: lightMode ? 0.28 : 0.45,
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
            enable: !lightMode,
          },
        },
      },
    }),
    [lightMode],
  );

  const particlesLoaded = async (_container?: Container): Promise<void> => {
    return;
  };

  if (!ready) {
    return <div aria-hidden className="pointer-events-none absolute inset-0 z-[2]" />;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <div className="absolute -top-52 left-[-16%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(0,209,255,0.14),transparent_72%)] blur-2xl" />
      <div className="absolute top-0 right-[-16%] h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(circle,rgba(51,156,255,0.11),transparent_70%)] blur-2xl" />
      {!lightMode ? (
        <div className="absolute bottom-[-16rem] left-1/2 h-[26rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,191,255,0.12),transparent_74%)] blur-3xl" />
      ) : null}

      <Particles
        id="neural-network-bg"
        className="absolute inset-0"
        options={options}
        particlesLoaded={particlesLoaded}
      />

      {!lightMode ? <div className="cyber-scanline absolute inset-0" /> : null}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(3,8,16,0.28)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.06),transparent_60%)]" />
    </div>
  );
}