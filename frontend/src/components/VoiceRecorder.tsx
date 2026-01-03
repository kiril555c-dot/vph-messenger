import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Send, Trash2, Lock, X } from 'lucide-react';
import WaveSurfer from 'wavesurfer.js';

interface VoiceRecorderProps {
  onSend: (audioBlob: Blob) => void;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const timerRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wavesurferRef.current) wavesurferRef.current.destroy();
      if (audioBlob) URL.revokeObjectURL(URL.createObjectURL(audioBlob));
    };
  }, []);

  // Initialize WaveSurfer for preview
  useEffect(() => {
    if (audioBlob && waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: 'rgba(255, 255, 255, 0.5)',
        progressColor: '#FF6B00',
        cursorColor: 'transparent',
        barWidth: 2,
        barGap: 3,
        height: 30,
        normalize: true,
      });

      const audioUrl = URL.createObjectURL(audioBlob);
      wavesurferRef.current.load(audioUrl);

      wavesurferRef.current.on('finish', () => {
        wavesurferRef.current?.stop();
      });

      return () => {
        wavesurferRef.current?.destroy();
        URL.revokeObjectURL(audioUrl);
      };
    }
  }, [audioBlob]);

  const startRecording = async (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault(); // Prevent text selection etc.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        // If not locked (released), send immediately
        if (!isLocked && !audioBlob) { // Check !audioBlob to avoid double send if logic overlaps
           // Logic handled in handleMouseUp
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setIsLocked(false);
      setRecordingTime(0);
      setAudioBlob(null);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      // Track start Y for drag-to-lock
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      startYRef.current = clientY;

    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setIsLocked(false);
    setRecordingTime(0);
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob);
      setAudioBlob(null);
      setIsLocked(false);
      setRecordingTime(0);
    }
  };

  // Handle release (Mouse Up / Touch End)
  const handleRelease = () => {
    if (isRecording && !isLocked) {
      // Stop and Send
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        
        // Wait for blob to be created in onstop
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            onSend(blob); // Send immediately
            setIsRecording(false);
            setRecordingTime(0);
            if (timerRef.current) clearInterval(timerRef.current);
        };
      }
    }
    startYRef.current = null;
  };

  // Handle Move (Mouse Move / Touch Move)
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (isRecording && !isLocked && startYRef.current !== null) {
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const diff = startYRef.current - clientY; // Dragging UP means clientY decreases
      
      if (diff > 50) { // Threshold to lock
        setIsLocked(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const togglePreview = () => {
    wavesurferRef.current?.playPause();
  };

  return (
    <div className="flex items-center gap-2 relative">
      {/* Recording UI Overlay (when holding or locked) */}
      {isRecording && (
        <div className="absolute bottom-0 right-0 left-[-200px] h-12 bg-flick-dark/90 backdrop-blur-md rounded-lg flex items-center px-4 gap-4 border border-white/10 z-20">
           <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
           <span className="font-pixel text-xs text-white">{formatTime(recordingTime)}</span>
           
           {/* Visualizer (Fake for now) */}
           <div className="flex-1 flex items-center gap-[2px] h-4 overflow-hidden">
              {[...Array(10)].map((_, i) => (
                  <div key={i} className="w-1 bg-flick-orange animate-pulse" style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }} />
              ))}
           </div>

           {isLocked ? (
             <div className="flex items-center gap-2">
                <button onClick={cancelRecording} className="text-white/50 hover:text-red-500 p-1">
                    <Trash2 size={18} />
                </button>
                <button onClick={() => { stopRecording(); }} className="text-flick-blue hover:text-white p-1">
                    <Square size={18} fill="currentColor" />
                </button>
             </div>
           ) : (
             <div className="flex items-center gap-2 text-white/30 text-[10px] font-pixel animate-bounce">
                <Lock size={12} />
                <span>SLIDE UP</span>
             </div>
           )}
        </div>
      )}

      {/* Review UI (after locked recording stopped) */}
      {!isRecording && audioBlob && (
        <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg">
          <button onClick={togglePreview} className="text-flick-orange hover:text-white">
             {/* Play/Pause icon could be dynamic but keeping simple */}
             <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-current border-b-[6px] border-b-transparent ml-1" />
          </button>
          <div
            ref={waveformRef}
            className="w-32 cursor-pointer"
            onClick={togglePreview}
          />
          <span className="text-[10px] font-pixel text-white/50">
             {formatTime(recordingTime)}
          </span>
          <button
            onClick={handleSend}
            className="text-flick-blue hover:text-white transition-colors"
          >
            <Send size={16} />
          </button>
          <button
            onClick={() => { setAudioBlob(null); setRecordingTime(0); }}
            className="text-white/50 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}

      {/* Mic Button */}
      {!audioBlob && (
        <button
          onMouseDown={startRecording}
          onMouseUp={handleRelease}
          onMouseMove={handleMove}
          onTouchStart={startRecording}
          onTouchEnd={handleRelease}
          onTouchMove={handleMove}
          onMouseLeave={handleRelease} // Safety: if mouse leaves button while holding
          className={`transition-all duration-200 ${
            isRecording 
              ? 'text-flick-orange scale-110' 
              : 'text-white/50 hover:text-flick-orange'
          }`}
        >
          <Mic size={20} className={isRecording ? 'animate-pulse' : ''} />
        </button>
      )}
    </div>
  );
};

export default VoiceRecorder;