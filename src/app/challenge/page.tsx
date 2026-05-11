'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import '../globals.css';

export default function ChallengeFriend() {
  const router = useRouter();
  const [step, setStep] = useState<'SETUP' | 'WAITING'>('SETUP');
  const [stake, setStake] = useState('1.0');
  const [targetScore, setTargetScore] = useState('3');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [creatorId, setCreatorId] = useState('');

  useEffect(() => {
    // Generate a unique ID for this player for this session
    let id = sessionStorage.getItem('kb_player_id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kb_player_id', id);
    }
    setCreatorId(id);
  }, []);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate a random 4-character alphanumeric code
    const code = 'KB-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    setInviteCode(code);
    
    try {
      // 1. Insert the room into Supabase
      const { error } = await supabase
        .from('rooms')
        .insert([
          { 
            id: code, 
            target_score: parseInt(targetScore), 
            stake: parseFloat(stake), 
            creator_id: creatorId,
            status: 'WAITING'
          }
        ]);

      if (error) {
        console.error('Error creating room:', error);
        alert('Failed to create room. Please ensure you have run the Supabase SQL setup.');
        return;
      }

      setStep('WAITING');
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = () => {
    const link = typeof window !== 'undefined' ? `${window.location.origin}/join/${inviteCode}` : '';
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (step === 'WAITING' && inviteCode) {
      // 2. Listen for a friend to join the room
      const subscription = supabase
        .channel(`room_${inviteCode}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'rooms',
          filter: `id=eq.${inviteCode}`
        }, (payload) => {
          const updatedRoom = payload.new;
          if (updatedRoom.status === 'IN_PROGRESS' && updatedRoom.opponent_id) {
            // Friend joined! Redirect to battle
            router.push(`/battle?room=${inviteCode}&role=creator&stake=${stake}&target=${targetScore}`);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [step, inviteCode, router, stake, targetScore]);

  return (
    <main className="container flex flex-col min-h-screen pb-4" style={{ paddingBottom: '1rem' }}>
      <header className="py-4 mb-4" style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--card-border)' }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'rgba(255,255,255,0.7)', marginRight: '1rem', fontSize: '1.5rem' }}>
          ←
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Challenge a Friend</h1>
      </header>

      <section className="flex flex-col flex-1" style={{ width: '100%' }}>
        {step === 'SETUP' && (
          <div className="card animate-fade-in" style={{ width: '100%' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1.5rem', color: 'var(--primary)' }}>Room Configuration</h2>
            
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                  Stake Amount (cUSD)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '0.5rem', padding: '0.5rem' }}>
                  <span style={{ padding: '0 0.5rem', color: 'var(--primary)' }}>💰</span>
                  <input 
                    type="number" 
                    step="0.1" 
                    min="0"
                    value={stake}
                    onChange={(e) => setStake(e.target.value)}
                    style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', fontSize: '1.125rem', outline: 'none' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                  Race to Target (Score)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                  {['3', '5', '10'].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTargetScore(val)}
                      style={{
                        padding: '0.75rem',
                        borderRadius: '0.5rem',
                        border: targetScore === val ? '2px solid var(--primary)' : '1px solid rgba(255,255,255,0.2)',
                        backgroundColor: targetScore === val ? 'rgba(53, 208, 127, 0.1)' : 'rgba(0,0,0,0.3)',
                        color: 'white',
                        fontWeight: targetScore === val ? 'bold' : 'normal',
                        cursor: 'pointer'
                      }}
                    >
                      {val} pts
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ backgroundColor: 'rgba(255,204,92,0.1)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,204,92,0.3)' }}>
                <p style={{ fontSize: '0.875rem', color: '#eab308' }}>
                  <strong>Note:</strong> Both players must deposit the stake into the smart contract escrow before the match begins. Winner takes all!
                </p>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>
                Generate Invite Link
              </button>
            </form>
          </div>
        )}

        {step === 'WAITING' && (
          <div className="card text-center animate-fade-in" style={{ width: '100%', padding: '2rem 1.5rem' }}>
            <div className="radar-spinner mx-auto" style={{ margin: '0 auto 2rem auto' }}></div>
            
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Waiting for Friend...</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2rem' }}>Share the link below so they can join.</p>
            
            <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1.5rem', wordBreak: 'break-all', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'var(--primary)', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                knowledgeboss.app/join/{inviteCode}
              </p>
            </div>

            <button 
              onClick={copyToClipboard} 
              className="btn btn-secondary" 
              style={{ marginBottom: '1.5rem' }}
            >
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Stake</p>
                <p style={{ fontWeight: 'bold' }}>{stake} cUSD</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)' }}>Race to</p>
                <p style={{ fontWeight: 'bold' }}>{targetScore} pts</p>
              </div>
            </div>
            
            <button 
              onClick={() => {
                supabase.from('rooms').delete().eq('id', inviteCode).then(() => {
                   setStep('SETUP');
                });
              }} 
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', textDecoration: 'underline', marginTop: '2rem', cursor: 'pointer' }}
            >
              Cancel & Go Back
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
