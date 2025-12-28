import React, { useEffect, useRef, useState } from 'react';
import { Phone, Video, Mic, MicOff, VideoOff, PhoneOff } from 'lucide-react';
import Peer from 'simple-peer';

interface CallModalProps {
  stream: MediaStream | null;
  callAccepted: boolean;
  callEnded: boolean;
  userVideo: React.RefObject<HTMLVideoElement>;
  myVideo: React.RefObject<HTMLVideoElement>;
  name: string;
  callUser: () => void;
  leaveCall: () => void;
  answerCall: () => void;
  receivingCall: boolean;
  isVideo: boolean;
}

const CallModal: React.FC<CallModalProps> = ({
  stream,
  callAccepted,
  callEnded,
  userVideo,
  myVideo,
  name,
  callUser,
  leaveCall,
  answerCall,
  receivingCall,
  isVideo
}) => {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);

  const toggleMic = () => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  const toggleCamera = () => {
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-flick-dark border border-white/10 rounded-2xl p-6 w-full max-w-4xl flex flex-col items-center">
        <h2 className="font-pixel text-xl text-white mb-6">
          {receivingCall && !callAccepted ? `INCOMING CALL FROM ${name}...` : `CALL WITH ${name}`}
        </h2>

        <div className="flex gap-4 w-full justify-center mb-8 relative">
          {/* My Video */}
          {stream && (
            <div className="relative rounded-xl overflow-hidden border-2 border-flick-orange w-1/2 aspect-video bg-black">
              <video playsInline muted ref={myVideo} autoPlay className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 font-pixel text-xs text-white bg-black/50 px-2 py-1 rounded">YOU</span>
            </div>
          )}

          {/* User Video */}
          {callAccepted && !callEnded && (
            <div className="relative rounded-xl overflow-hidden border-2 border-flick-blue w-1/2 aspect-video bg-black">
              <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
              <span className="absolute bottom-2 left-2 font-pixel text-xs text-white bg-black/50 px-2 py-1 rounded">{name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-6">
          {receivingCall && !callAccepted ? (
            <button
              onClick={answerCall}
              className="bg-green-500 hover:bg-green-600 text-white p-4 rounded-full transition-colors animate-pulse"
            >
              <Phone size={32} />
            </button>
          ) : (
            <>
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-colors ${micOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}
              >
                {micOn ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              
              {isVideo && (
                <button
                  onClick={toggleCamera}
                  className={`p-4 rounded-full transition-colors ${cameraOn ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-red-500/20 text-red-500'}`}
                >
                  {cameraOn ? <Video size={24} /> : <VideoOff size={24} />}
                </button>
              )}

              <button
                onClick={leaveCall}
                className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-full transition-colors"
              >
                <PhoneOff size={32} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallModal;