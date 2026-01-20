
import React, { useState, useEffect } from 'react';
import { CAPABILITIES } from './constants.tsx';
import { Capability, Message } from './types.ts';
import { gemini, decodeBase64 } from './services/geminiService.ts';
import LiveSession from './components/LiveSession.tsx';

const App: React.FC = () => {
  const [activeCapability, setActiveCapability] = useState<Capability | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [veoLoadingMessage, setVeoLoadingMessage] = useState('');

  const VEO_LOADING_MESSAGES = [
    "Khởi tạo không gian 3D...",
    "Dàn dựng ánh sáng Cinematic...",
    "Render khung hình chất lượng cao...",
    "Đang hoàn tất các chi tiết cuối...",
  ];

  const handleSend = async () => {
    if (!inputValue.trim() || !activeCapability) return;

    const userMsg: Message = { role: 'user', text: inputValue };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      let aiResponse: any;

      switch (activeCapability.id) {
        case 'chat':
          aiResponse = await gemini.generateChat(inputValue, []);
          setMessages(prev => [...prev, { role: 'model', text: aiResponse.text || '' }]);
          break;
        case 'search':
          aiResponse = await gemini.generateWithSearch(inputValue);
          const chunks = aiResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const urls = chunks.map((c: any) => ({
            title: c.web?.title || 'Tham khảo',
            uri: c.web?.uri || ''
          })).filter((u: any) => u.uri);
          setMessages(prev => [...prev, { role: 'model', text: aiResponse.text || '', groundingUrls: urls }]);
          break;
        case 'image':
          const imgUrl = await gemini.generateImage(inputValue);
          setMessages(prev => [...prev, { role: 'model', text: 'Đây là tác phẩm của bạn:', imageUrl: imgUrl }]);
          break;
        case 'audio':
          const base64Audio = await gemini.generateSpeech(inputValue);
          if (base64Audio) {
            setMessages(prev => [...prev, { role: 'model', text: 'Đã tạo giọng nói thành công!' }]);
            playAudio(base64Audio);
          }
          break;
        case 'video':
          let msgIdx = 0;
          const interval = setInterval(() => {
            setVeoLoadingMessage(VEO_LOADING_MESSAGES[msgIdx % VEO_LOADING_MESSAGES.length]);
            msgIdx++;
          }, 6000);
          try {
            const videoUrl = await gemini.generateVideoVeo(inputValue);
            setMessages(prev => [...prev, { role: 'model', text: 'Video Veo của bạn đã hoàn thành:', videoUrl }]);
          } finally {
            clearInterval(interval);
            setVeoLoadingMessage('');
          }
          break;
      }
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'model', text: `Lỗi: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (base64: string) => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const data = decodeBase64(base64);
    const dataInt16 = new Int16Array(data.buffer);
    const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center py-10 px-4 md:px-8">
      {/* Header */}
      <header className="w-full max-w-5xl mb-16 text-center space-y-4">
        <div className="inline-block px-4 py-1.5 glass rounded-full text-blue-400 text-xs font-bold tracking-widest uppercase mb-2 border border-blue-500/20">
          Google Gemini 3.0 Pro
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold gradient-text tracking-tighter">
          Gemini Hub
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
          Trải nghiệm trí tuệ nhân tạo đa phương thức với giao diện Glassmorphism thế hệ mới.
        </p>
      </header>

      {/* Main Grid */}
      <main className="w-full max-w-6xl">
        {!activeCapability ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {CAPABILITIES.map(cap => (
              <button
                key={cap.id}
                onClick={() => setActiveCapability(cap)}
                className="glass glass-card group relative overflow-hidden rounded-[2rem] p-8 text-left border border-white/10"
              >
                <div className={`absolute -right-4 -top-4 w-24 h-24 accent-gradient opacity-10 group-hover:opacity-30 blur-2xl transition-opacity rounded-full`} />
                <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform duration-500">{cap.icon}</div>
                <h3 className="text-2xl font-bold mb-3 text-white/90">{cap.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed font-medium">{cap.description}</p>
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-blue-400">
                  Khám phá <span className="group-hover:translate-x-2 transition-transform">→</span>
                </div>
              </button>
            ))}
            
            {/* Live API Highlight */}
            <button
              onClick={() => setShowLive(true)}
              className="glass glass-card group relative overflow-hidden rounded-[2rem] p-8 text-left border-2 border-blue-500/30"
            >
              <div className="absolute inset-0 accent-gradient opacity-5 group-hover:opacity-10 transition-opacity" />
              <div className="text-5xl mb-6">⚡</div>
              <h3 className="text-2xl font-bold mb-3 text-white">Live Voice Call</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-medium">Giao tiếp bằng giọng nói tự nhiên với độ trễ gần như bằng không.</p>
              <div className="mt-8 flex items-center gap-3">
                <span className="flex h-3 w-3 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-xs font-black text-green-400 uppercase tracking-widest">Live Now</span>
              </div>
            </button>
          </div>
        ) : (
          /* Module View */
          <div className="glass rounded-[2.5rem] flex flex-col h-[80vh] w-full border border-white/10 overflow-hidden shadow-2xl">
            {/* Module Header */}
            <div className="px-8 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{activeCapability.icon}</span>
                <div>
                  <h2 className="text-xl font-extrabold text-white/90">{activeCapability.title}</h2>
                  <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">{activeCapability.type}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveCapability(null)}
                className="px-5 py-2 glass hover:bg-white/10 rounded-full text-sm font-bold transition-all"
              >
                Đóng
              </button>
            </div>

            {/* Chat Flow */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                  <div className="text-8xl mb-6">{activeCapability.icon}</div>
                  <p className="text-xl font-medium italic">Sẵn sàng thực hiện yêu cầu của bạn...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                  <div className={`max-w-[80%] rounded-[1.5rem] px-6 py-4 ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' 
                    : 'glass text-slate-200 border border-white/10'
                  }`}>
                    <p className="leading-relaxed">{msg.text}</p>
                    {msg.imageUrl && <img src={msg.imageUrl} className="mt-4 rounded-xl w-full border border-white/10 shadow-2xl" />}
                    {msg.videoUrl && <video src={msg.videoUrl} controls className="mt-4 rounded-xl w-full border border-white/10 shadow-2xl" />}
                    {msg.groundingUrls && (
                      <div className="mt-4 pt-4 border-t border-white/5 grid gap-2">
                        {msg.groundingUrls.map((u, j) => (
                          <a key={j} href={u.uri} target="_blank" className="text-xs text-blue-400 hover:underline flex items-center gap-2">
                            🔗 {u.title}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="glass rounded-[1.5rem] px-6 py-4 flex items-center gap-4 border border-white/10">
                    <div className="flex gap-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                    {veoLoadingMessage && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{veoLoadingMessage}</span>}
                  </div>
                </div>
              )}
            </div>

            {/* Input Wrapper */}
            <div className="p-6 bg-white/5 border-t border-white/5">
              <div className="max-w-4xl mx-auto flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Mô tả ý tưởng cho ${activeCapability.title}...`}
                  className="flex-1 glass rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder:text-slate-500"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-8 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-2xl font-black text-sm uppercase tracking-wider transition-all shadow-xl active:scale-95"
                >
                  {isLoading ? '...' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-16 text-slate-600 text-xs font-bold tracking-[0.2em] uppercase">
        Ultra Glass UI • Powered by Gemini AI
      </footer>

      {showLive && <LiveSession onClose={() => setShowLive(false)} />}
    </div>
  );
};

export default App;
