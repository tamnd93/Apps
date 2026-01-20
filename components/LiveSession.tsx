
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { encodeBase64, decodeBase64, decodeAudioData } from '../services/geminiService';

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
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Live session opened');
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
          systemInstruction: 'Bạn là một trợ lý giọng nói thân thiện. Hãy trò chuyện ngắn gọn và sinh động.',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="glass w-full max-w-2xl rounded-3xl p-8 flex flex-col items-center gap-6">
        <h2 className="text-2xl font-bold gradient-text">Hội thoại Trực tiếp</h2>
        
        <div className="relative w-48 h-48 flex items-center justify-center">
          {isActive && (
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
          )}
          <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl shadow-xl transition-all duration-500 ${isActive ? 'bg-blue-600 scale-110' : 'bg-slate-700'}`}>
            {isActive ? '🎙️' : '💤'}
          </div>
        </div>

        <div className="w-full h-48 overflow-y-auto bg-black/30 rounded-xl p-4 text-sm font-mono space-y-2 border border-white/5">
          {transcription.length === 0 ? (
            <p className="text-slate-500 text-center italic mt-16">Bắt đầu trò chuyện để xem bản ghi âm...</p>
          ) : (
            transcription.map((line, i) => (
              <div key={i} className={line.startsWith('AI:') ? 'text-blue-400' : 'text-slate-300'}>
                {line}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-4">
          {!isActive ? (
            <button 
              onClick={startSession}
              disabled={isConnecting}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 rounded-full font-semibold transition-all shadow-lg"
            >
              {isConnecting ? 'Đang kết nối...' : 'Bắt đầu Hội thoại'}
            </button>
          ) : (
            <button 
              onClick={() => { sessionRef.current?.close(); setIsActive(false); }}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-full font-semibold transition-all shadow-lg"
            >
              Kết thúc
            </button>
          )}
          <button onClick={onClose} className="px-8 py-3 glass hover:bg-white/10 rounded-full font-semibold">Đóng</button>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;
