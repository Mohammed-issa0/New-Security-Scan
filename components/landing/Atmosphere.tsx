'use client';

import { useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { Container, ISourceOptions } from '@tsparticles/engine';

export function LandingAtmosphere() {
  const [ready, setReady] = useState(false);

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
      fpsLimit: 50,
      detectRetina: true,
      particles: {
        number: {
          value: 72,
          density: {
            enable: true,
            area: 1200,
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
          value: { min: 1, max: 3.2 },
        },
        links: {
          enable: true,
          distance: 150,
          color: '#62e7ff',
          opacity: 0.3,
          width: 0.75,
        },
        move: {
          enable: true,
          speed: 0.5,
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
            enable: true,
          },
        },
      },
    }),
    [],
  );

  const particlesLoaded = async (_container?: Container): Promise<void> => {
    return;
  };

  if (!ready) {
    return <div aria-hidden className="pointer-events-none absolute inset-0 z-[2]" />;
  }

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      <div className="absolute -top-52 left-[-16%] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(0,209,255,0.18),transparent_72%)] blur-3xl" />
      <div className="absolute top-0 right-[-16%] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(51,156,255,0.14),transparent_70%)] blur-3xl" />
      <div className="absolute bottom-[-16rem] left-1/2 h-[26rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(0,191,255,0.12),transparent_74%)] blur-3xl" />

      <Particles
        id="neural-network-bg"
        className="absolute inset-0"
        options={options}
        particlesLoaded={particlesLoaded}
      />

      <div className="cyber-scanline absolute inset-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_18%,rgba(3,8,16,0.28)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,209,255,0.08),transparent_60%)]" />
    </div>
  );
}