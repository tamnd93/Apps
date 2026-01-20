
import React from 'react';
import { Capability, CapabilityType } from './types';

export const CAPABILITIES: Capability[] = [
  {
    id: 'chat',
    type: CapabilityType.TEXT,
    title: 'Trợ lý Thông minh',
    description: 'Tư duy logic, giải quyết bài tập, viết code và sáng tạo nội dung văn bản.',
    icon: '✍️',
    color: 'from-blue-500 to-indigo-600',
  },
  {
    id: 'image',
    type: CapabilityType.IMAGE,
    title: 'Họa sĩ AI',
    description: 'Tạo hình ảnh nghệ thuật từ mô tả văn bản hoặc chỉnh sửa ảnh có sẵn.',
    icon: '🎨',
    color: 'from-purple-500 to-pink-600',
  },
  {
    id: 'video',
    type: CapabilityType.VIDEO,
    title: 'Đạo diễn Video',
    description: 'Sử dụng Veo 3.1 để tạo các đoạn video chất lượng cao từ ý tưởng của bạn.',
    icon: '🎬',
    color: 'from-orange-500 to-red-600',
  },
  {
    id: 'live',
    type: CapabilityType.LIVE,
    title: 'Giao tiếp Thời gian thực',
    description: 'Hệ thống Live API cho phép trò chuyện bằng giọng nói tự nhiên như người thật.',
    icon: '🎙️',
    color: 'from-green-500 to-teal-600',
  },
  {
    id: 'search',
    type: CapabilityType.SEARCH,
    title: 'Tra cứu Thông tin',
    description: 'Kết nối trực tiếp với Google Search để cập nhật tin tức và sự kiện mới nhất.',
    icon: '🔍',
    color: 'from-cyan-500 to-blue-600',
  },
  {
    id: 'audio',
    type: CapabilityType.AUDIO,
    title: 'Chuyển đổi Giọng nói',
    description: 'Biến văn bản thành giọng nói (TTS) đa dạng cảm xúc và ngôn ngữ.',
    icon: '🔊',
    color: 'from-yellow-500 to-amber-600',
  },
];
