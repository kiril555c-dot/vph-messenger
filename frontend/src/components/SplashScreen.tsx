import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [show, setShow] = useState(true);
  const [glitch, setGlitch] = useState(false);
  const [dissolve, setDissolve] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);

  useEffect(() => {
    const audio = new Audio('/start.mp3');
    audio.volume = 0.5;
    audio.load(); // Preload audio
    
    const playAudio = async () => {
        try {
            await audio.play();
        } catch (e) {
            console.error("Audio play failed", e);
            setAudioBlocked(true);
            // Try playing on user interaction if autoplay is blocked
            const playOnInteraction = () => {
                audio.play().catch(console.error);
                setAudioBlocked(false);
                document.removeEventListener('click', playOnInteraction);
                document.removeEventListener('keydown', playOnInteraction);
                document.removeEventListener('touchstart', playOnInteraction);
            };
            document.addEventListener('click', playOnInteraction);
            document.addEventListener('keydown', playOnInteraction);
            document.addEventListener('touchstart', playOnInteraction);
        }
    };

    // Trigger glitch effect
    const glitchInterval = setInterval(() => {
      setGlitch(prev => !prev);
    }, 100);

    // Stop glitch and start dissolve
    const timer1 = setTimeout(() => {
      clearInterval(glitchInterval);
      setGlitch(false);
      setDissolve(true);
      playAudio(); // Play sound when dissolve starts
    }, 2000);

    // Complete splash screen
    const timer2 = setTimeout(() => {
      setShow(false);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, 3000);

    return () => {
      clearInterval(glitchInterval);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[100] bg-black flex items-center justify-center transition-opacity duration-500 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`relative flex flex-col items-center transition-all duration-1000 ${dissolve ? 'scale-150 opacity-0 filter blur-xl' : ''}`}>
        <div className={`relative w-96 h-96 ${glitch ? 'translate-x-1' : ''}`}>
            <img src="/logo.png" alt="Flick" className="w-full h-full object-contain" />
            {glitch && (
                <>
                    <img src="/logo.png" alt="Flick" className="absolute top-0 left-0 w-full h-full object-contain opacity-50 -translate-x-1 animate-pulse mix-blend-screen filter hue-rotate-90" />
                    <img src="/logo.png" alt="Flick" className="absolute top-0 left-0 w-full h-full object-contain opacity-50 translate-x-1 animate-pulse mix-blend-screen filter hue-rotate-180" />
                </>
            )}
            {dissolve && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-pulse"></div>
            )}
        </div>
        {audioBlocked && (
            <div className="absolute bottom-10 text-white/50 text-xs font-pixel animate-pulse">
                CLICK TO START
            </div>
        )}
      </div>
    </div>
  );
};

export default SplashScreen;