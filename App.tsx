
import React, { useState } from 'react';
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
    "Đang chuẩn bị bối cảnh...",
    "Thiết lập ánh sáng và camera...",
    "Đang xử lý các khung hình đầu tiên...",
    "Tối ưu hóa chất lượng 720p...",
    "Sắp xong rồi, vui lòng đợi trong giây lát...",
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
            title: c.web?.title || 'Link',
            uri: c.web?.uri || ''
          })).filter((u: any) => u.uri);
          setMessages(prev => [...prev, { 
            role: 'model', 
            text: aiResponse.text || '',
            groundingUrls: urls
          }]);
          break;

        case 'image':
          const imgUrl = await gemini.generateImage(inputValue);
          setMessages(prev => [...prev, { role: 'model', text: 'Đây là hình ảnh tôi đã tạo cho bạn:', imageUrl: imgUrl }]);
          break;

        case 'audio':
          const base64Audio = await gemini.generateSpeech(inputValue);
          if (base64Audio) {
            setMessages(prev => [...prev, { role: 'model', text: 'Đã tạo xong giọng nói, đang phát...' }]);
            playAudio(base64Audio);
          }
          break;

        case 'video':
          let msgIdx = 0;
          const interval = setInterval(() => {
            setVeoLoadingMessage(VEO_LOADING_MESSAGES[msgIdx % VEO_LOADING_MESSAGES.length]);
            msgIdx++;
          }, 5000);
          
          try {
            const videoUrl = await gemini.generateVideoVeo(inputValue);
            setMessages(prev => [...prev, { role: 'model', text: 'Video của bạn đã sẵn sàng:', videoUrl }]);
          } finally {
            clearInterval(interval);
            setVeoLoadingMessage('');
          }
          break;
      }
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Có lỗi xảy ra: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = async (base64: string) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const data = decodeBase64(base64);
      const dataInt16 = new Int16Array(data.buffer);
      const buffer = audioCtx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) {
        channelData[i] = dataInt16[i] / 32768.0;
      }
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      source.start();
    } catch (e) {
      console.error("Audio playback failed", e);
    }
  };

  const handleCapabilitySelect = async (cap: Capability) => {
    if (cap.id === 'video') {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) await aistudio.openSelectKey();
      }
    }
    setActiveCapability(cap);
    setMessages([]);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center p-4 md:p-8 overflow-x-hidden">
      <header className="w-full max-w-6xl mb-12 text-center animate-in fade-in slide-in-from-top-4 duration-1000">
        <h1 className="text-4xl md:text-6xl font-black mb-4 gradient-text tracking-tight">Gemini Hub</h1>
        <p className="text-slate-400 text-lg md:text-xl font-light">
          Hệ sinh thái AI đa phương thức mạnh mẽ nhất từ Google.
        </p>
      </header>

      <main className="w-full max-w-6xl flex-1 flex flex-col items-center">
        {!activeCapability ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full animate-in fade-in zoom-in-95 duration-700">
            {CAPABILITIES.map(cap => (
              <button
                key={cap.id}
                onClick={() => handleCapabilitySelect(cap)}
                className="glass group relative overflow-hidden rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${cap.color} opacity-10 group-hover:opacity-20 transition-opacity rounded-bl-full`} />
                <div className="text-5xl mb-4">{cap.icon}</div>
                <h3 className="text-xl font-bold mb-2">{cap.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{cap.description}</p>
                <div className="mt-6 inline-flex items-center text-sm font-semibold text-blue-400 group-hover:translate-x-1 transition-transform">
                  Trải nghiệm ngay →
                </div>
              </button>
            ))}
            
            <button
              onClick={() => setShowLive(true)}
              className="glass group relative overflow-hidden rounded-3xl p-8 text-left border-2 border-blue-500/30 hover:border-blue-500/60"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 opacity-20 rounded-bl-full animate-pulse" />
              <div className="text-5xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">Live API (Native)</h3>
              <p className="text-slate-400 text-sm leading-relaxed">Trò chuyện âm thanh trực tiếp với độ trễ cực thấp.</p>
              <div className="mt-6 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-bold text-green-400 uppercase">Sẵn sàng</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="glass rounded-3xl flex flex-col h-[75vh] w-full relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeCapability.icon}</span>
                <div>
                  <h2 className="font-bold">{activeCapability.title}</h2>
                  <p className="text-xs text-slate-400">{activeCapability.type}</p>
                </div>
              </div>
              <button 
                onClick={() => setActiveCapability(null)}
                className="px-4 py-2 hover:bg-white/10 rounded-full transition-colors text-sm font-medium"
              >
                ← Quay lại
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                  <div className="text-6xl mb-4 grayscale">{activeCapability.icon}</div>
                  <p className="text-lg">Bắt đầu nhập yêu cầu bên dưới...</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-800 border border-white/10 shadow-lg'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="AI Art" className="mt-3 rounded-lg w-full max-w-md shadow-2xl border border-white/5" />
                    )}
                    {msg.videoUrl && (
                      <video src={msg.videoUrl} controls className="mt-3 rounded-lg w-full max-w-xl shadow-2xl border border-white/5" />
                    )}
                    {msg.groundingUrls && msg.groundingUrls.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nguồn Tin Cậy:</p>
                        {msg.groundingUrls.map((link, j) => (
                          <a key={j} href={link.uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            <span className="text-xs opacity-70">🔗</span> <span className="truncate">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-800 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                    <div className="flex space-x-1.5">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                    </div>
                    {veoLoadingMessage && <span className="text-xs text-slate-400 font-medium">{veoLoadingMessage}</span>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50 backdrop-blur-md border-t border-white/10">
              <div className="flex gap-2 max-w-4xl mx-auto">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={`Mô tả ý tưởng cho ${activeCapability.title}...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all placeholder:text-slate-600"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading || !inputValue.trim()}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 px-6 rounded-2xl font-bold transition-all shadow-xl active:scale-95 flex items-center justify-center min-w-[100px]"
                >
                  {isLoading ? '...' : 'Gửi'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 text-slate-500 text-sm font-medium py-4 opacity-70">
        Gemini Hub • 2024 AI Multimodal Showcase
      </footer>

      {showLive && <LiveSession onClose={() => setShowLive(false)} />}
    </div>
  );
};

export default App;
