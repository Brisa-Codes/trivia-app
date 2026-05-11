'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import '../globals.css';

export default function Matchmaking() {
  const router = useRouter();
  const [dots, setDots] = useState('');
  const [opponentFound, setOpponentFound] = useState(false);
  const [opponentName, setOpponentName] = useState('');

  useEffect(() => {
    // Animation for loading dots
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    // Simulate finding an opponent
    const matchTimeout = setTimeout(() => {
      clearInterval(dotsInterval);
      setOpponentFound(true);
      setOpponentName('CryptoWhale_99');

      // Transition to battle screen after showing opponent
      setTimeout(() => {
        router.push('/battle');
      }, 2000);
    }, 3000);

    return () => {
      clearInterval(dotsInterval);
      clearTimeout(matchTimeout);
    };
  }, [router]);

  return (
    <main className="container flex flex-col items-center justify-center min-h-screen">
      <div className="card text-center" style={{ width: '100%', padding: '3rem 2rem' }}>
        {!opponentFound ? (
          <>
            <div className="radar-spinner mb-4 mx-auto" style={{ margin: '0 auto 2rem auto' }}></div>
            <h2 className="gradient-text mb-4" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              Finding Opponent{dots}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem' }}>
              Stake: 0.50 cUSD
            </p>
          </>
        ) : (
          <div className="animate-fade-in">
            <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#4ade80' }}>
              Match Found!
            </h2>
            
            <div className="flex justify-between items-center gap-4 mb-4" style={{ marginBottom: '2rem' }}>
              <div className="text-center" style={{ flex: 1 }}>
                <div style={{ width: '4rem', height: '4rem', backgroundColor: '#2563eb', borderRadius: '50%', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  👤
                </div>
                <p style={{ fontWeight: 'bold' }}>You</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>12.50 cUSD</p>
              </div>
              
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308' }}>
                VS
              </div>
              
              <div className="text-center" style={{ flex: 1 }}>
                <div style={{ width: '4rem', height: '4rem', backgroundColor: '#dc2626', borderRadius: '50%', margin: '0 auto 0.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  👾
                </div>
                <p style={{ fontWeight: 'bold' }}>{opponentName}</p>
                <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>18.20 cUSD</p>
              </div>
            </div>
            
            <p className="animate-pulse" style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
              Preparing battle arena...
            </p>
          </div>
        )}
      </div>


    </main>
  );
}
