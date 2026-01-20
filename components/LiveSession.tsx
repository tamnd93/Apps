
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/geminiService.ts';

const LiveSession: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const startSession = async () => {
    setIsConnecting(true);
    try {
      const apiKey = (window as any).process?.env?.API_KEY || "";
      const ai = new GoogleGenAI({ apiKey });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);

            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              const pcmBlob = {
                data: encodeBase64(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setTranscription(prev => [...prev, `AI: ${message.serverContent.outputTranscription.text}`]);
            }
            if (message.serverContent?.inputTranscription) {
              setTranscription(prev => [...prev, `Bạn: ${message.serverContent.inputTranscription.text}`]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              
              const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onerror: (e) => console.error('Live error', e),
          onclose: () => setIsActive(false),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
          systemInstruction: 'Bạn là một trợ lý giọng nói thân thiện. Hãy trò chuyện ngắn gọn.',
        },
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
      if (outputAudioContextRef.current) outputAudioContextRef.current.close();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-lg p-4">
      <div className="glass w-full max-w-2xl rounded-[2.5rem] p-10 flex flex-col items-center gap-8 shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-300">
        <h2 className="text-3xl font-black gradient-text">Native Live Voice</h2>
        
        <div className="relative w-56 h-56 flex items-center justify-center">
          {isActive && (
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping duration-1000" />
          )}
          <div className={`w-40 h-40 rounded-full flex items-center justify-center text-5xl shadow-2xl transition-all duration-700 ${isActive ? 'bg-blue-600 scale-105 rotate-0' : 'bg-slate-800 scale-100'}`}>
            {isActive ? '🎙️' : '🔘'}
          </div>
        </div>

        <div className="w-full h-40 overflow-y-auto bg-black/40 rounded-2xl p-5 text-sm font-medium space-y-3 border border-white/5 custom-scrollbar">
          {transcription.length === 0 ? (
            <p className="text-slate-600 text-center italic mt-12">Nhấn nút bên dưới để bắt đầu hội thoại...</p>
          ) : (
            transcription.map((line, i) => (
              <div key={i} className={`flex ${line.startsWith('AI:') ? 'text-blue-400' : 'text-slate-300'}`}>
                <span className="opacity-50 mr-2">●</span> {line}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-4 w-full justify-center">
          {!isActive ? (
            <button 
              onClick={startSession}
              disabled={isConnecting}
              className="flex-1 max-w-[220px] py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-2xl font-bold transition-all shadow-xl shadow-blue-900/20 active:scale-95"
            >
              {isConnecting ? 'Đang kết nối...' : 'Bắt đầu ngay'}
            </button>
          ) : (
            <button 
              onClick={() => { sessionRef.current?.close(); setIsActive(false); }}
              className="flex-1 max-w-[220px] py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-bold transition-all shadow-xl shadow-red-900/20 active:scale-95"
            >
              Dừng cuộc gọi
            </button>
          )}
          <button onClick={onClose} className="px-8 py-4 glass hover:bg-white/10 rounded-2xl font-bold transition-all">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
