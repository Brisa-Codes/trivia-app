'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import '../globals.css';

type GameState = 'STARTING' | 'YOUR_TURN_ASK' | 'WAITING_FOR_QUESTION' | 'YOUR_TURN_ANSWER' | 'OPPONENT_ANSWERING' | 'ROUND_RESULT' | 'GAME_OVER';

function BattleArena() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get('room');
  const role = searchParams.get('role'); // 'creator' or 'opponent'
  
  const [gameState, setGameState] = useState<GameState>('STARTING');
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [round, setRound] = useState(1);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(role === 'creator');
  
  const targetScore = parseInt(searchParams.get('target') || '3');
  const stake = searchParams.get('stake') || '0.50';
  
  const [playerId, setPlayerId] = useState('');
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(15);
  
  // Question State
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [correctOption, setCorrectOption] = useState<string | null>(null);
  const [roundResultText, setRoundResultText] = useState('');
  
  // Form State for Asker
  const [formQText, setFormQText] = useState('');
  const [formCorrect, setFormCorrect] = useState('');
  const [formW1, setFormW1] = useState('');
  const [formW2, setFormW2] = useState('');
  const [formW3, setFormW3] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Analytics State
  const [playerTimes, setPlayerTimes] = useState<number[]>([]);
  const [opponentTimes, setOpponentTimes] = useState<number[]>([]);
  
  // Setup Player ID
  useEffect(() => {
    let id = sessionStorage.getItem('kb_player_id');
    if (!id) {
      id = 'player_' + Math.random().toString(36).substring(2, 9);
      sessionStorage.setItem('kb_player_id', id);
    }
    setPlayerId(id);
  }, []);

  // Determine whose turn it is to ask based on round number
  // Round 1: Creator, Round 2: Opponent, Round 3: Creator, etc.
  const isMyTurnToAsk = (roundNum: number) => {
    return (roundNum % 2 !== 0 && isCreator) || (roundNum % 2 === 0 && !isCreator);
  };

  // Initial Sequence
  useEffect(() => {
    if (gameState === 'STARTING') {
      setTimeLeft(15); // Reset timer safely before any transitions
      const timer = setTimeout(() => {
        if (isMyTurnToAsk(round)) {
          setGameState('YOUR_TURN_ASK');
        } else {
          setGameState('WAITING_FOR_QUESTION');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [gameState, round, isCreator]);

  // Auto-generate question on turn start
  useEffect(() => {
    if (gameState === 'YOUR_TURN_ASK' && formQText === '') {
      handleAIGenerate();
    }
  }, [gameState]);

  // Timer Countdown Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState === 'YOUR_TURN_ANSWER' || gameState === 'OPPONENT_ANSWERING') {
      setTimeLeft(15);
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState]);

  // Auto-Submit on Timeout
  useEffect(() => {
    if (gameState === 'YOUR_TURN_ANSWER' && timeLeft === 0 && selectedOption === null) {
      handleAnswer('⏰ TIMEOUT');
    }
  }, [timeLeft, gameState, selectedOption]);

  // Listen for Supabase Realtime changes
  useEffect(() => {
    if (!roomId) return;

    const subscription = supabase
      .channel(`battle_${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'rounds',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const newRound = payload.new;
        if (newRound.round_number === round) {
          setCurrentRoundId(newRound.id);
          setQuestionText(newRound.question);
          setOptions(newRound.options);
          setCorrectOption(newRound.correct_option);
          setTimeLeft(15); // Reset timer safely before transition
          
          if (newRound.asker_id !== playerId) {
            setGameState('YOUR_TURN_ANSWER');
          }
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rounds',
        filter: `room_id=eq.${roomId}`
      }, (payload) => {
        const updatedRound = payload.new;
        if (updatedRound.round_number === round && updatedRound.selected_option) {
          // Parse time taken
          const parts = updatedRound.selected_option.split('::');
          const actualOption = parts[0];
          const timeTaken = parts.length > 1 ? parseFloat(parts[1]) : null;
          
          updatedRound.selected_option = actualOption;
          updatedRound.time_taken = timeTaken;
          
          // The round has been answered!
          handleRoundResult(updatedRound);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`
      }, (payload) => {
        if (payload.new.status === 'CLOSED') {
          alert('The match has been closed. Returning to home.');
          window.location.href = '/';
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [roomId, round, playerId]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    // Shuffle options
    const allOptions = [formCorrect, formW1, formW2, formW3].sort(() => Math.random() - 0.5);

    setGameState('OPPONENT_ANSWERING');

    const { error } = await supabase.from('rounds').insert([{
      room_id: roomId,
      round_number: round,
      asker_id: playerId,
      question: formQText,
      options: allOptions,
      correct_option: formCorrect
    }]);

    if (error) {
      console.error("Error submitting question:", JSON.stringify(error, null, 2));
      alert("Failed to submit question: " + (error.message || JSON.stringify(error)));
      setGameState('YOUR_TURN_ASK'); // reset state
    }
    
    // Clear form for next time
    setFormQText('');
    setFormCorrect('');
    setFormW1('');
    setFormW2('');
    setFormW3('');
  };

  const decodeHtml = (html: string) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  const handleAIGenerate = async () => {
    setIsGenerating(true);
    
    const FALLBACK_QUESTIONS = [
      { q: "What is the largest organ in the human body?", c: "Skin", w1: "Liver", w2: "Brain", w3: "Heart" },
      { q: "Who wrote the novel '1984'?", c: "George Orwell", w1: "Aldous Huxley", w2: "Ray Bradbury", w3: "J.D. Salinger" },
      { q: "Which planet is known as the Red Planet?", c: "Mars", w1: "Venus", w2: "Jupiter", w3: "Saturn" },
      { q: "What is the capital city of Australia?", c: "Canberra", w1: "Sydney", w2: "Melbourne", w3: "Perth" },
      { q: "In what year did the Titanic sink?", c: "1912", w1: "1905", w2: "1915", w3: "1923" },
      { q: "Which element has the chemical symbol 'Au'?", c: "Gold", w1: "Silver", w2: "Argon", w3: "Aluminum" },
      { q: "Who painted the Mona Lisa?", c: "Leonardo da Vinci", w1: "Vincent van Gogh", w2: "Pablo Picasso", w3: "Michelangelo" },
      { q: "What is the hardest natural substance on Earth?", c: "Diamond", w1: "Graphene", w2: "Quartz", w3: "Titanium" },
      { q: "Which film won the first Academy Award for Best Picture?", c: "Wings", w1: "Metropolis", w2: "The Jazz Singer", w3: "City Lights" },
      { q: "What is the longest river in the world?", c: "Nile", w1: "Amazon", w2: "Yangtze", w3: "Mississippi" }
    ];

    try {
      // Fetch a random multiple choice question from the Open Trivia Database
      const res = await fetch('https://opentdb.com/api.php?amount=1&type=multiple');
      const data = await res.json();
      
      if (data.response_code === 0 && data.results && data.results.length > 0) {
        const q = data.results[0];
        setFormQText(decodeHtml(q.question));
        setFormCorrect(decodeHtml(q.correct_answer));
        setFormW1(decodeHtml(q.incorrect_answers[0] || 'Option 2'));
        setFormW2(decodeHtml(q.incorrect_answers[1] || 'Option 3'));
        setFormW3(decodeHtml(q.incorrect_answers[2] || 'Option 4'));
      } else {
        throw new Error("API empty or rate limited");
      }
    } catch (err) {
      console.warn("API rate limit hit, using offline fallback pool.");
      // Seamlessly fall back to local array
      const randomQ = FALLBACK_QUESTIONS[Math.floor(Math.random() * FALLBACK_QUESTIONS.length)];
      setFormQText(randomQ.q);
      setFormCorrect(randomQ.c);
      setFormW1(randomQ.w1);
      setFormW2(randomQ.w2);
      setFormW3(randomQ.w3);
    }
    
    setIsGenerating(false);
  };

  const handleAnswer = async (option: string) => {
    setSelectedOption(option);
    
    const taken = option === '⏰ TIMEOUT' ? 15 : 15 - timeLeft;
    
    // Send answer to supabase
    const { error } = await supabase.from('rounds')
      .update({ answerer_id: playerId, selected_option: `${option}::${taken}` })
      .eq('id', currentRoundId);

    if (error) console.error("Error submitting answer:", error);
  };

  const handleRoundResult = (roundData: any) => {
    const isCorrect = roundData.selected_option === roundData.correct_option;
    const isTimeout = roundData.selected_option === '⏰ TIMEOUT';
    const isAsker = roundData.asker_id === playerId;
    
    // Store times
    if (roundData.time_taken !== null && !isTimeout) {
      if (isAsker) {
        setOpponentTimes(prev => [...prev, roundData.time_taken]);
      } else {
        setPlayerTimes(prev => [...prev, roundData.time_taken]);
      }
    }
    
    setGameState('ROUND_RESULT');
    
    const timeStr = roundData.time_taken !== null ? ` in ${roundData.time_taken}s` : '';
    
    if (isAsker) {
      if (isTimeout) {
        setRoundResultText(`Opponent ran out of time! You gain a point.`);
        setPlayerScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore + 1, opponentScore), 4000);
      } else if (isCorrect) {
        setRoundResultText(`Opponent got it right${timeStr}! They gain a point.`);
        setOpponentScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore, opponentScore + 1), 4000);
      } else {
        setRoundResultText(`Opponent guessed wrong${timeStr}! You gain a point.`);
        setPlayerScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore + 1, opponentScore), 4000);
      }
    } else {
      // User is the answerer
      if (isTimeout) {
        setRoundResultText(`Time's up! The correct answer was ${roundData.correct_option}. Opponent gains a point.`);
        setOpponentScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore, opponentScore + 1), 4000);
      } else if (isCorrect) {
        setRoundResultText(`Correct${timeStr}! You gain a point.`);
        setPlayerScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore + 1, opponentScore), 4000);
      } else {
        setRoundResultText(`Wrong${timeStr}! The correct answer was ${roundData.correct_option}. Opponent gains a point.`);
        setOpponentScore(prev => prev + 1);
        setTimeout(() => checkGameOver(playerScore, opponentScore + 1), 4000);
      }
    }
  };

  const handleFinish = async () => {
    if (!roomId) return;
    // Tell the room the game is officially closed
    await supabase.from('rooms').update({ status: 'CLOSED' }).eq('id', roomId);
    window.location.href = '/';
  };

  const checkGameOver = (pScore: number, oScore: number) => {
    if (pScore >= targetScore || oScore >= targetScore) {
      setGameState('GAME_OVER');
      // Update room status
      if (isCreator) {
        supabase.from('rooms').update({ status: 'FINISHED' }).eq('id', roomId).then();
      }
    } else {
      setRound(prev => prev + 1);
      setSelectedOption(null);
      setTimeLeft(15); // Clear the timer state completely
      setGameState('STARTING'); // Resets the turn automatically via the useEffect
    }
  };

  const winnings = (parseFloat(stake) * 2 * 0.9).toFixed(2);

  const calculateAvgTime = (times: number[]) => {
    if (times.length === 0) return '0.0';
    return (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
  };

  return (
    <main className="container flex flex-col min-h-screen pb-4" style={{ paddingBottom: '1rem' }}>
      {/* Header / Scoreboard */}
      <header className="flex justify-between items-center py-4 mb-4" style={{ padding: '1rem 0', borderBottom: '1px solid var(--card-border)', marginBottom: '1.5rem' }}>
        <div className="flex flex-col items-center">
          <span style={{ fontSize: '1.25rem' }}>👤</span>
          <span style={{ fontWeight: 'bold' }}>You</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>{playerScore}</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Race to {targetScore}</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px', marginTop: '0.25rem' }}>Round {round}</span>
          <span style={{ fontSize: '0.75rem', color: '#eab308', marginTop: '0.25rem' }}>Stake: {stake} cUSD</span>
        </div>
        
        <div className="flex flex-col items-center">
          <span style={{ fontSize: '1.25rem' }}>👾</span>
          <span style={{ fontWeight: 'bold' }}>Opponent</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{opponentScore}</span>
        </div>
      </header>

      {/* Main Battle Arena */}
      <section className="flex flex-col items-center justify-center" style={{ flex: 1, width: '100%' }}>
        
        {gameState === 'STARTING' && (
          <div className="text-center animate-pulse">
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#eab308', marginBottom: '0.5rem' }}>ROUND {round} STARTING</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>Get ready...</p>
          </div>
        )}

        {gameState === 'YOUR_TURN_ASK' && (
          <div className="card animate-fade-in" style={{ width: '100%' }}>
            <h2 className="text-center" style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.25rem', color: 'var(--primary)' }}>Your Turn to Ask</h2>
            <p className="text-center" style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>Type manually or let AI suggest a question!</p>
            
            <form onSubmit={handleSubmitQuestion} className="flex flex-col gap-4">
              <div style={{ position: 'relative' }}>
                <textarea 
                  value={formQText}
                  readOnly
                  style={{ 
                    width: '100%', 
                    backgroundColor: 'rgba(0,0,0,0.4)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '0.75rem', 
                    padding: '1rem', 
                    paddingBottom: '3rem',
                    color: 'white', 
                    resize: 'none',
                    fontSize: '1rem',
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  rows={4}
                  placeholder="Generating a random trivia question..."
                  required
                />
                <button 
                  type="button" 
                  onClick={handleAIGenerate}
                  disabled={isGenerating}
                  title="Generate a Random AI Question"
                  style={{ 
                    position: 'absolute',
                    bottom: '0.75rem',
                    right: '0.75rem',
                    backgroundColor: 'rgba(138, 43, 226, 0.3)', 
                    border: '1px solid var(--accent)', 
                    color: '#d8b4fe', 
                    padding: '0.35rem 0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    borderRadius: '1rem', 
                    cursor: isGenerating ? 'wait' : 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    boxShadow: '0 0 10px rgba(138,43,226,0.3)',
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  {isGenerating ? <div className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px', borderTopColor: '#d8b4fe' }}></div> : <><span>🎲</span> Reroll Question</>}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={formCorrect} readOnly placeholder="Correct Answer" style={{ width: '100%', backgroundColor: 'rgba(20, 83, 45, 0.2)', border: '1px solid rgba(34, 197, 94, 0.5)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', fontSize: '0.875rem', color: 'white', outline: 'none' }} required />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem' }}>✅</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={formW1} readOnly placeholder="Wrong Option" style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', fontSize: '0.875rem', color: 'white', outline: 'none' }} required />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem' }}>❌</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={formW2} readOnly placeholder="Wrong Option" style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', fontSize: '0.875rem', color: 'white', outline: 'none' }} required />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem' }}>❌</span>
                </div>
                <div style={{ position: 'relative' }}>
                  <input type="text" value={formW3} readOnly placeholder="Wrong Option" style={{ width: '100%', backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.5rem', padding: '0.75rem 0.75rem 0.75rem 2.25rem', fontSize: '0.875rem', color: 'white', outline: 'none' }} required />
                  <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem' }}>❌</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>Lock In Question</button>
              </div>
            </form>
          </div>
        )}

        {gameState === 'OPPONENT_ANSWERING' && (
          <div className="text-center">
            <div className="spinner mb-4 mx-auto" style={{ borderTopColor: timeLeft <= 5 ? '#ef4444' : 'var(--primary)' }}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Opponent is thinking...</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>They are answering your question</p>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: timeLeft <= 5 ? '#ef4444' : 'white', textShadow: '0 0 10px rgba(0,0,0,0.5)' }}>
              {timeLeft}s
            </div>
          </div>
        )}

        {gameState === 'WAITING_FOR_QUESTION' && (
          <div className="text-center">
            <div className="spinner mb-4 mx-auto" style={{ borderTopColor: '#ef4444' }}></div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Opponent is typing...</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)' }}>They are formulating a question for you</p>
          </div>
        )}

        {gameState === 'YOUR_TURN_ANSWER' && (
          <div className="card animate-fade-in" style={{ width: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold', color: timeLeft <= 5 ? '#ef4444' : '#eab308' }}>
              ⏳ {timeLeft}s
            </div>
            <h2 className="text-center" style={{ fontSize: '0.875rem', fontWeight: 'bold', color: '#f87171', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Opponent Asks:</h2>
            <p className="text-center mb-4" style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '2rem' }}>{questionText}</p>
            
            <div className="flex flex-col gap-2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
              {options.map((opt, i) => {
                let btnStyle: React.CSSProperties = {
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  textAlign: 'left',
                  cursor: selectedOption !== null ? 'default' : 'pointer',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  color: 'white'
                };
                
                if (selectedOption === opt) {
                  btnStyle.backgroundColor = opt === correctOption ? '#16a34a' : '#dc2626';
                  btnStyle.borderColor = opt === correctOption ? '#16a34a' : '#dc2626';
                } else if (selectedOption !== null && opt === correctOption) {
                  btnStyle.backgroundColor = '#16a34a'; // reveal correct answer
                  btnStyle.borderColor = '#16a34a';
                }
                
                return (
                  <button 
                    key={i}
                    onClick={() => handleAnswer(opt)}
                    disabled={selectedOption !== null}
                    style={btnStyle}
                    className="answer-btn"
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {gameState === 'ROUND_RESULT' && (
          <div className="text-center animate-fade-in card" style={{ padding: '2rem', border: '1px solid #eab308', width: '100%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Round Result</h2>
            <p style={{ fontSize: '1.125rem' }}>{roundResultText}</p>
          </div>
        )}

        {gameState === 'GAME_OVER' && (
          <div className="text-center animate-fade-in card" style={{ width: '100%', border: '1px solid var(--primary)', padding: '2rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
              {playerScore >= targetScore ? 'YOU WIN! 🎉' : 'YOU LOSE 😢'}
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem' }}>
              {playerScore >= targetScore 
                ? `You reached the target score first! You earned ${winnings} cUSD.` 
                : `Opponent reached the target score first. You lost ${stake} cUSD.`}
            </p>
            
            <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: '1rem', padding: '1.5rem', marginBottom: '2rem', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.5)', marginBottom: '1rem' }}>Speed Analytics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Your Avg Time</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4ade80' }}>{calculateAvgTime(playerTimes)}s</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Opponent Avg</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f87171' }}>{calculateAvgTime(opponentTimes)}s</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center" style={{ gap: '1rem' }}>
              <button onClick={handleFinish} className="btn btn-primary" style={{ flex: 1, padding: '1rem', fontSize: '1rem', fontWeight: 'bold' }}>
                Finish & Close Room
              </button>
            </div>
          </div>
        )}

      </section>
    </main>
  );
}

export default function Battle() {
  return (
    <Suspense fallback={<div className="container flex items-center justify-center min-h-screen text-xl">Loading Arena...</div>}>
      <BattleArena />
    </Suspense>
  );
}
