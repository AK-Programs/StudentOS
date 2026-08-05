import React, { useEffect, useRef } from 'react';
import { MicOff, Hand, User } from 'lucide-react';
import { MeetingParticipant } from '../../types';

interface RemoteVideoTileProps {
  participant: MeetingParticipant;
  stream?: MediaStream | null;
  isScreenSharing?: boolean;
}

export const RemoteVideoTile: React.FC<RemoteVideoTileProps> = ({
  participant,
  stream,
  isScreenSharing
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks()[0].enabled) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => {
          console.warn('[StudentOS Meet] Remote video play error:', err);
        });
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream, participant.isCameraOn, isScreenSharing]);

  const hasVideoTrack = stream && stream.getVideoTracks().some(t => t.enabled && t.readyState === 'live');

  return (
    <div
      className={`relative aspect-video bg-slate-900 rounded-3xl border ${
        isScreenSharing ? 'border-teal-500/80 shadow-teal-500/20' : 'border-white/10'
      } overflow-hidden shadow-2xl flex items-center justify-center group hover:border-indigo-500/50 transition-all`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${(!participant.isCameraOn || !hasVideoTrack) ? 'hidden' : 'block'}`}
      />

      {(!participant.isCameraOn || !hasVideoTrack) && (
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-2xl font-black shadow-lg">
          {participant.name ? participant.name.charAt(0).toUpperCase() : <User className="w-8 h-8" />}
        </div>
      )}

      {/* Participant Badge Overlay */}
      <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/75 backdrop-blur-md rounded-xl text-xs font-extrabold text-white flex items-center gap-2 border border-white/10 z-10 shadow-lg">
        <span className="truncate max-w-[140px]">{participant.name}</span>
        <span className="text-[10px] uppercase font-mono text-indigo-400">({participant.role})</span>
        {!participant.isMicOn && <MicOff className="w-3.5 h-3.5 text-rose-400" />}
        {participant.isHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
      </div>

      {isScreenSharing && (
        <div className="absolute top-3 right-3 px-2.5 py-1 bg-teal-500/20 border border-teal-500/40 rounded-full text-[10px] font-mono font-black text-teal-300 uppercase z-10">
          Screen Sharing
        </div>
      )}
    </div>
  );
};
