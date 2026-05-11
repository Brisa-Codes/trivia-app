'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import '../../globals.css';

export default function JoinRoom() {
  const params = useParams();
  const router = useRouter();
  const [room, setRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');
  const [playerId, setPlayerId] = useState('');

  const roomId = params.id as string;

  useEffect(() => {
    // Generate opponent ID
    let id = sessionStorage.getItem('kb_player_id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kb_player_id', id);
    }
    setPlayerId(id);

    // Fetch room details
    const fetchRoom = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error || !data) {
        setError('Room not found or has expired.');
      } else if (data.status !== 'WAITING') {
        setError('This room is already full or the game has finished.');
      } else {
        setRoom(data);
      }
      setLoading(false);
    };

    if (roomId) fetchRoom();
  }, [roomId]);

  const handleJoin = async () => {
    setJoining(true);
    
    // Update room status
    const { error } = await supabase
      .from('rooms')
      .update({ status: 'IN_PROGRESS', opponent_id: playerId })
      .eq('id', roomId);

    if (error) {
      console.error(error);
      setError('Failed to join room.');
      setJoining(false);
      return;
    }

    // Redirect to battle
    router.push(`/battle?room=${roomId}&role=opponent&stake=${room.stake}&target=${room.target_score}`);
  };

  return (
    <main className="container flex flex-col items-center justify-center min-h-screen">
      <div className="card text-center" style={{ width: '100%', padding: '3rem 2rem' }}>
        {loading ? (
          <div className="spinner mx-auto mb-4"></div>
        ) : error ? (
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--error)', marginBottom: '1rem' }}>Oops!</h2>
            <p style={{ marginBottom: '2rem' }}>{error}</p>
            <button onClick={() => router.push('/')} className="btn btn-secondary">Go Home</button>
          </div>
        ) : (
          <div className="animate-fade-in">
            <h2 className="gradient-text mb-2" style={{ fontSize: '1.875rem', fontWeight: 'bold' }}>
              You've Been Challenged!
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '2rem' }}>
              Room Code: {roomId}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Stake</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary)' }}>{room.stake} cUSD</p>
              </div>
              <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.2)' }}></div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Target</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308' }}>{room.target_score} pts</p>
              </div>
            </div>
            
            <button 
              onClick={handleJoin} 
              disabled={joining}
              className="btn btn-primary"
            >
              {joining ? 'Joining...' : 'Accept & Stake ►'}
            </button>
            <button 
              onClick={() => router.push('/')} 
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', marginTop: '1.5rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
