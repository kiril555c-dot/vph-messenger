import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  src: string;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src }) => {
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurfer = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState<string>('0:00');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (waveformRef.current) {
      if (wavesurfer.current) {
        wavesurfer.current.destroy();
      }

      try {
        wavesurfer.current = WaveSurfer.create({
          container: waveformRef.current,
          waveColor: 'rgba(255, 255, 255, 0.5)',
          progressColor: '#FF6B00',
          cursorColor: 'transparent',
          barWidth: 2,
          barGap: 3,
          height: 30,
          normalize: true,
        });

        const audioUrl = src.startsWith('http')
          ? src
          : `https://vph-messenger.onrender.com${src}`;
        
        wavesurfer.current.load(audioUrl);

        wavesurfer.current.on('ready', () => {
          const d = wavesurfer.current?.getDuration() || 0;
          const mins = Math.floor(d / 60);
          const secs = Math.floor(d % 60);
          setDuration(`${mins}:${secs.toString().padStart(2, '0')}`);
          setError(null);
        });

        wavesurfer.current.on('finish', () => {
          setIsPlaying(false);
        });

        wavesurfer.current.on('play', () => {
          setIsPlaying(true);
        });

        wavesurfer.current.on('pause', () => {
          setIsPlaying(false);
        });

        wavesurfer.current.on('error', (err) => {
            console.error("WaveSurfer error:", err);
            // Ignore AbortError as it happens on cleanup
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setError("Failed to load audio");
        });

      } catch (e) {
        console.error("Error creating WaveSurfer:", e);
        setError("Error initializing player");
      }

      return () => {
        if (wavesurfer.current) {
            try {
                wavesurfer.current.destroy();
            } catch (e) {
                // Ignore destroy errors
            }
        }
      };
    }
  }, [src]);

  const togglePlay = () => {
    if (wavesurfer.current) {
      wavesurfer.current.playPause();
    }
  };

  if (error) {
      return <div className="text-red-500 text-[10px]">{error}</div>;
  }

  return (
    <div className="flex items-center gap-3 w-48">
      <button onClick={togglePlay} className="text-flick-orange hover:text-white transition-colors">
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div ref={waveformRef} className="flex-1" />
      <span className="text-[10px] font-pixel text-white/50 min-w-[30px] text-right">
        {duration}
      </span>
    </div>
  );
};

export default AudioPlayer;