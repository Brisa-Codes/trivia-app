import './globals.css';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="container flex flex-col justify-between">
      {/* Header */}
      <header className="mt-4 text-center">
        <h1 className="gradient-text" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          🧠 Knowledge Boss
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>
          Ask. Answer. Boss up.
        </p>
      </header>

      {/* Player Stats Card */}
      <section className="card mt-4">
        <div className="flex justify-between items-center mb-2">
          <h2 style={{ fontSize: '1.2rem' }}>Welcome back, Player! 👋</h2>
        </div>
        <div className="flex gap-4 mt-4">
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Rank</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>🏆 #47</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Streak</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600 }}>🔥 3 Days</p>
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)' }}>Balance</p>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--primary)' }}>💰 12.50 cUSD</p>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="flex flex-col gap-4 mt-4">
        <div className="card" style={{ padding: '1rem', border: '1px solid var(--primary)' }}>
          <h3 className="mb-2">⚡ QUICK MATCH</h3>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Auto-match with a random player. <br/>Default Stake: 0.50 cUSD
          </p>
          <Link href="/matchmaking" className="btn btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>PLAY NOW ►</Link>
        </div>

        <div className="card" style={{ padding: '1rem' }}>
          <h3 className="mb-2">👥 CHALLENGE A FRIEND</h3>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', marginBottom: '1rem' }}>
            Send an invite link. Custom stake and rules.
          </p>
          <Link href="/challenge" className="btn btn-secondary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>CREATE ROOM ►</Link>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="mt-4 mb-4">
        <h3 style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>── Recent Battles ──</h3>
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center" style={{ background: 'rgba(53, 208, 127, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <span>✅ Won vs Player_42</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>+0.45 cUSD</span>
          </div>
          <div className="flex justify-between items-center" style={{ background: 'rgba(255, 77, 77, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <span>❌ Lost vs CryptoKing</span>
            <span style={{ color: 'var(--error)', fontWeight: 600 }}>-0.50 cUSD</span>
          </div>
          <div className="flex justify-between items-center" style={{ background: 'rgba(53, 208, 127, 0.1)', padding: '0.75rem 1rem', borderRadius: '8px' }}>
            <span>✅ Won vs BrainStorm</span>
            <span style={{ color: 'var(--primary)', fontWeight: 600 }}>+0.90 cUSD</span>
          </div>
        </div>
      </section>
      
      {/* Footer Nav */}
      <footer className="flex justify-between mt-auto pt-4" style={{ borderTop: '1px solid var(--card-border)' }}>
        <button className="btn-secondary" style={{ padding: '0.5rem 1rem', border: 'none', fontSize: '0.9rem' }}>🏆 Leaderboard</button>
        <button className="btn-secondary" style={{ padding: '0.5rem 1rem', border: 'none', fontSize: '0.9rem' }}>👤 Profile</button>
      </footer>
    </main>
  );
}
