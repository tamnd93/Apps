
export enum CapabilityType {
  TEXT = 'Văn bản & Tư duy',
  IMAGE = 'Sáng tạo Hình ảnh',
  VIDEO = 'Sản xuất Video (Veo)',
  AUDIO = 'Âm thanh & TTS',
  LIVE = 'Hội thoại Trực tiếp',
  SEARCH = 'Tra cứu Google Search',
}

export interface Message {
  role: 'user' | 'model';
  text: string;
  imageUrl?: string;
  videoUrl?: string;
  groundingUrls?: { title: string; uri: string }[];
}

export interface Capability {
  id: string;
  type: CapabilityType;
  title: string;
  description: string;
  icon: string;
  color: string;
}
