'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

// ==================== CONFIG ====================
const API_CONFIG = {
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
  DEEPSEEK_MODEL: 'deepseek-chat',
};

// 环境变量中的 API Key（后台配置，优先级高）
const ENV_API_KEY = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || '';
const ENV_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ENV_SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY || '';

// ==================== SUPABASE CLIENT ====================
class SupabaseClient {
  private url: string = '';
  private key: string = '';
  private userId: string = '';

  configure(url: string, key: string) {
    this.url = url.replace(/\/$/, '');
    this.key = key;
    if (typeof window !== 'undefined') {
      let deviceId = localStorage.getItem('tcm_device_id');
      if (!deviceId) {
        deviceId = 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('tcm_device_id', deviceId);
      }
      this.userId = deviceId;
    }
  }

  isConfigured() { return !!(this.url && this.key); }
  getUserId() { return this.userId; }

  private async request(endpoint: string, options: RequestInit = {}) {
    if (!this.isConfigured()) throw new Error('Supabase 未配置');
    const response = await fetch(`${this.url}/rest/v1/${endpoint}`, {
      ...options,
      headers: { 'apikey': this.key, 'Authorization': `Bearer ${this.key}`, 'Content-Type': 'application/json', 'Prefer': options.method === 'POST' ? 'return=representation' : 'return=minimal', ...options.headers },
    });
    if (!response.ok) throw new Error(`Supabase error: ${await response.text()}`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  async getDocuments() { return this.request(`documents?user_id=eq.${this.userId}&order=created_at.desc`); }
  async addDocument(doc: any) { return this.request('documents', { method: 'POST', body: JSON.stringify({ ...doc, user_id: this.userId }) }); }
  async deleteDocument(id: number) { return this.request(`documents?id=eq.${id}`, { method: 'DELETE' }); }
  async searchDocuments(query: string) { return this.request(`documents?user_id=eq.${this.userId}&or=(title.ilike.*${query}*,content.ilike.*${query}*,summary.ilike.*${query}*)&order=created_at.desc`); }
  async getHealthLogs() { return this.request(`health_logs?user_id=eq.${this.userId}&order=created_at.desc`); }
  async addHealthLog(log: any) { return this.request('health_logs', { method: 'POST', body: JSON.stringify({ ...log, user_id: this.userId }) }); }
  async addDiagnosisRecord(record: any) { return this.request('diagnosis_records', { method: 'POST', body: JSON.stringify({ ...record, user_id: this.userId }) }); }
}

const supabase = new SupabaseClient();

// ==================== ICONS ====================
const Icons = {
  Book: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  Chat: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  Heart: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>,
  Send: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Sparkles: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>,
  Leaf: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Brain: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.5"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.5"/></svg>,
  Stethoscope: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>,
  FolderOpen: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2"/></svg>,
  Camera: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>,
  Image: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  X: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Mic: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  MicOff: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="2" y1="2" x2="22" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 5"/><path d="M15 9.34V5a3 3 0 0 0-5.68-1.33"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><line x1="12" y1="19" x2="12" y2="22"/></svg>,
  Settings: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Key: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>,
  Database: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  Refresh: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>,
  Search: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Wechat: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348z"/></svg>,
  Video: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>,
  FileText: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Merge: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/></svg>,
  MapPin: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Compass: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>,
  Target: () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  Calendar: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  CheckCircle: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  Zap: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  File: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  Upload: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
};

// ==================== SOURCE TYPES ====================
const SOURCE_TYPES = [
  { id: 'camera', label: '拍照识别', icon: Icons.Camera, color: '#10B981' },
  { id: 'voice', label: '语音录入', icon: Icons.Mic, color: '#8B5CF6' },
  { id: 'image', label: '相册图片', icon: Icons.Image, color: '#3B82F6' },
  { id: 'document', label: '导入文档', icon: Icons.File, color: '#F59E0B' },
  { id: 'video', label: '视频字幕', icon: Icons.Video, color: '#EF4444' },
  { id: 'wechat', label: '微信聊天', icon: Icons.Wechat, color: '#07C160' },
  { id: 'wechat_group', label: '微信群聊', icon: Icons.Users, color: '#07C160' },
  { id: 'note', label: '个人笔记', icon: Icons.FileText, color: '#6B7280' },
];

// 穴位图片数据库（使用网络图片）
const ACUPOINT_IMAGES: { [key: string]: { name: string; location: string; image: string; description: string } } = {
  '足三里': { name: '足三里', location: '小腿外侧，犊鼻下3寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Stomach_meridian.png/200px-Stomach_meridian.png', description: '外膝眼下3寸，胫骨前嵴外一横指处' },
  '合谷': { name: '合谷', location: '手背第1、2掌骨间', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Large_intestine_meridian.png/200px-Large_intestine_meridian.png', description: '虎口处，第2掌骨桡侧中点' },
  '内关': { name: '内关', location: '前臂掌侧，腕横纹上2寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Pericardium_meridian.png/200px-Pericardium_meridian.png', description: '腕横纹上2寸，两筋之间' },
  '太冲': { name: '太冲', location: '足背，第1、2跖骨间', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Liver_meridian.png/200px-Liver_meridian.png', description: '足背第1、2跖骨结合部前方凹陷处' },
  '风池': { name: '风池', location: '项部，枕骨下', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Gallbladder_meridian.png/200px-Gallbladder_meridian.png', description: '胸锁乳突肌与斜方肌之间凹陷中' },
  '三阴交': { name: '三阴交', location: '小腿内侧，内踝尖上3寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Spleen_meridian.png/200px-Spleen_meridian.png', description: '内踝尖上3寸，胫骨内侧缘后方' },
  '百会': { name: '百会', location: '头顶正中', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Governor_vessel.png/200px-Governor_vessel.png', description: '头顶正中线与两耳尖连线的交点' },
  '关元': { name: '关元', location: '下腹部，脐下3寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Conception_vessel.png/200px-Conception_vessel.png', description: '前正中线上，脐下3寸' },
  '中脘': { name: '中脘', location: '上腹部，脐上4寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Conception_vessel.png/200px-Conception_vessel.png', description: '前正中线上，脐上4寸' },
  '气海': { name: '气海', location: '下腹部，脐下1.5寸', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Conception_vessel.png/200px-Conception_vessel.png', description: '前正中线上，脐下1.5寸' },
  '肩井': { name: '肩井', location: '肩上，大椎与肩峰连线中点', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Gallbladder_meridian.png/200px-Gallbladder_meridian.png', description: '肩部最高点，大椎穴与肩峰端连线的中点' },
  '涌泉': { name: '涌泉', location: '足底前部凹陷处', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kidney_meridian.png/200px-Kidney_meridian.png', description: '足底，卷足时足前部凹陷处' },
  '太溪': { name: '太溪', location: '足内侧，内踝后方', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Kidney_meridian.png/200px-Kidney_meridian.png', description: '内踝尖与跟腱之间凹陷处' },
  '神门': { name: '神门', location: '腕部，腕掌横纹尺侧端', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ac/Heart_meridian.png/200px-Heart_meridian.png', description: '腕掌横纹尺侧端，尺侧腕屈肌腱桡侧凹陷处' },
  '委中': { name: '委中', location: '腘横纹中点', image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Bladder_meridian.png/200px-Bladder_meridian.png', description: '膝后腘窝横纹的中点' },
};

const COMMON_SYMPTOMS = ['头痛', '头晕', '乏力', '失眠', '多梦', '畏寒', '怕热', '出汗', '心悸', '胸闷', '气短', '咳嗽', '咽痛', '腹胀', '腹痛', '便秘', '腹泻', '食欲不振', '恶心', '口苦', '口干', '腰痛', '膝软', '耳鸣'];

// ==================== LOCAL STORAGE ====================
const storage = {
  get: (key: string, def: any = null) => { if (typeof window === 'undefined') return def; try { return JSON.parse(localStorage.getItem(key) || 'null') || def; } catch { return def; } },
  set: (key: string, val: any) => { if (typeof window === 'undefined') return; try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
};

// ==================== DEEPSEEK API ====================
const callDeepSeek = async (apiKey: string, messages: any[], systemPrompt: string) => {
  const res = await fetch(API_CONFIG.DEEPSEEK_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: API_CONFIG.DEEPSEEK_MODEL, messages: [{ role: 'system', content: systemPrompt }, ...messages], temperature: 0.7, max_tokens: 4000 }),
  });
  if (!res.ok) throw new Error(`API错误: ${res.status}`);
  return (await res.json()).choices[0].message.content;
};

// ==================== OCR ====================
const loadTesseract = () => new Promise<any>((resolve, reject) => {
  if ((window as any).Tesseract) { resolve((window as any).Tesseract); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js';
  s.onload = () => resolve((window as any).Tesseract);
  s.onerror = reject;
  document.head.appendChild(s);
});

const performOCR = async (file: File, onProgress: (p: number) => void) => {
  const T = await loadTesseract();
  const r = await T.recognize(file, 'chi_sim+eng', { logger: (m: any) => { if (m.status === 'recognizing text') onProgress(Math.round(m.progress * 100)); } });
  return r.data.text;
};

// ==================== SPEECH ====================
const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const ref = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      setIsSupported(!!SR);
      if (SR) {
        ref.current = new SR();
        ref.current.continuous = true;
        ref.current.interimResults = true;
        ref.current.lang = 'zh-CN';
        ref.current.onresult = (e: any) => { let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setTranscript(t); };
        ref.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const start = useCallback(() => { if (ref.current && !isListening) { setTranscript(''); ref.current.start(); setIsListening(true); } }, [isListening]);
  const stop = useCallback(() => { if (ref.current && isListening) { ref.current.stop(); setIsListening(false); } }, [isListening]);
  const reset = useCallback(() => setTranscript(''), []);

  return { isListening, transcript, isSupported, start, stop, reset };
};

// ==================== SYSTEM PROMPTS ====================
const PROMPTS = {
  diagnosis: `你是一位经验丰富的中医师。根据患者症状，提供：
1. 辨证分析（证型判断）
2. 食补建议（具体食材、做法）
3. 中成药参考（OTC药物）
4. 穴位推荐（名称、位置、操作方法）
5. 导引策略（具体动作、呼吸方法、练习时间）
6. 生活调理建议
用Markdown格式，内容要具体可操作。`,

  qa: `你是中医知识助手。基于知识库回答问题。\n知识库：\n{knowledge}\n\n优先使用知识库内容，可补充通用知识。`,

  summarize: `提取中医知识要点，包括：穴位、方剂、食疗、导引方法等。用简洁Markdown。`,

  merge: `你是中医知识整理专家。请合并分析以下多条微信聊天记录，提取：
1. **核心知识点**：穴位、方剂、食疗等
2. **实用方法**：具体操作步骤
3. **注意事项**：禁忌和提醒
4. **知识分类**：按主题归类

聊天记录：
{content}

请整合去重，形成结构化的知识总结。`,

  acupoint: `你是中医穴位专家。根据用户描述的症状或问题，提供穴位建议。

请按以下格式回复（便于系统提取穴位名称显示图片）：

## 推荐穴位

### 1. [穴位名称]
- **位置**：精确解剖定位
- **功效**：主治功能
- **操作**：按揉/艾灸方法，时间频率

### 2. [穴位名称]
...

## 穴位配伍
说明主穴配穴组合原理

## 注意事项
- 禁忌人群
- 操作注意

常用穴位名称参考：足三里、合谷、内关、太冲、风池、三阴交、百会、关元、中脘、气海、肩井、涌泉、太溪、神门、委中

请确保穴位名称使用标准名称，以便系统匹配穴位图片。`,

  guidance: `你是中医导引养生专家。根据用户的症状和体质，提供个性化的导引策略：

1. **导引功法推荐**
   - 功法名称（如八段锦、五禽戏、六字诀等）
   - 针对性动作（具体哪几式）
   - 详细动作要领
   - 呼吸配合方法

2. **练习方案**
   - 每日练习时间
   - 练习频率
   - 循序渐进计划

3. **配合要点**
   - 最佳练习时间
   - 环境要求
   - 饮食配合

4. **注意事项**
   - 禁忌动作
   - 不适处理

请提供具体、可执行的方案。`,
};

// ==================== MAIN APP ====================
export default function TCMAssistant() {
  const [activeTab, setActiveTab] = useState('input');
  const [documents, setDocuments] = useState<any[]>([]);
  const [healthLogs, setHealthLogs] = useState<any[]>([]);
  
  // Settings - 优先使用环境变量，其次使用本地存储
  const [apiKey, setApiKey] = useState('');
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'none' | 'connected' | 'error'>('none');
  const [useEnvKeys, setUseEnvKeys] = useState(false); // 是否使用环境变量
  
  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  
  // Merge
  const [selectedDocs, setSelectedDocs] = useState<number[]>([]);
  const [mergeResult, setMergeResult] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  
  // Acupoint finder
  const [acupointQuery, setAcupointQuery] = useState('');
  const [acupointResult, setAcupointResult] = useState('');
  const [isSearchingAcupoint, setIsSearchingAcupoint] = useState(false);
  
  // Guidance
  const [guidanceQuery, setGuidanceQuery] = useState('');
  const [guidanceResult, setGuidanceResult] = useState('');
  const [isGeneratingGuidance, setIsGeneratingGuidance] = useState(false);
  
  // Form states
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [customSymptom, setCustomSymptom] = useState('');
  const [diagnosisForm, setDiagnosisForm] = useState({ tongue: '', pulse: '', duration: '', voiceDesc: '', tongueImage: '' });
  const [diagnosisResult, setDiagnosisResult] = useState('');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [showTongueCamera, setShowTongueCamera] = useState(false);
  const [tongueStream, setTongueStream] = useState<MediaStream | null>(null);
  const tongueVideoRef = useRef<HTMLVideoElement>(null);
  const tongueCanvasRef = useRef<HTMLCanvasElement>(null);
  const [healthData, setHealthData] = useState({ steps: '', heartRate: '', systolic: '', diastolic: '', sleep: '', weight: '' });
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', sourceType: 'wechat', tags: '' });
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isOCRing, setIsOCRing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [isProcessingDoc, setIsProcessingDoc] = useState(false);
  const [docProgress, setDocProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { isListening, transcript, isSupported: voiceSupported, start: startVoice, stop: stopVoice, reset: resetTranscript } = useSpeechRecognition();
  const [voiceTarget, setVoiceTarget] = useState<'input' | 'diagnosis'>('input');

  // Load data - 环境变量优先
  useEffect(() => {
    // 检查是否有环境变量配置
    const hasEnvApiKey = !!ENV_API_KEY;
    const hasEnvSupabase = !!(ENV_SUPABASE_URL && ENV_SUPABASE_KEY);
    
    // API Key: 环境变量 > 本地存储
    const ak = hasEnvApiKey ? ENV_API_KEY : storage.get('tcm_api_key', '');
    // Supabase: 环境变量 > 本地存储
    const su = hasEnvSupabase ? ENV_SUPABASE_URL : storage.get('tcm_supabase_url', '');
    const sk = hasEnvSupabase ? ENV_SUPABASE_KEY : storage.get('tcm_supabase_key', '');
    
    setApiKey(ak);
    setSupabaseUrl(su);
    setSupabaseKey(sk);
    setUseEnvKeys(hasEnvApiKey || hasEnvSupabase);
    
    if (su && sk) { 
      supabase.configure(su, sk); 
      setSyncStatus('connected'); 
      loadFromSupabase(); 
    } else { 
      setDocuments(storage.get('tcm_documents', [])); 
      setHealthLogs(storage.get('tcm_health_logs', [])); 
    }
  }, []);

  const loadFromSupabase = async () => {
    if (!supabase.isConfigured()) return;
    setIsSyncing(true);
    try {
      const [docs, logs] = await Promise.all([supabase.getDocuments(), supabase.getHealthLogs()]);
      setDocuments(docs || []);
      setHealthLogs(logs || []);
      setSyncStatus('connected');
    } catch { setSyncStatus('error'); setDocuments(storage.get('tcm_documents', [])); setHealthLogs(storage.get('tcm_health_logs', [])); }
    setIsSyncing(false);
  };

  useEffect(() => { if (transcript) { if (voiceTarget === 'input') setNewEntry(p => ({ ...p, content: p.content + transcript })); else setDiagnosisForm(p => ({ ...p, voiceDesc: p.voiceDesc + transcript })); resetTranscript(); } }, [transcript, voiceTarget, resetTranscript]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const saveSettings = async () => { storage.set('tcm_api_key', apiKey); storage.set('tcm_supabase_url', supabaseUrl); storage.set('tcm_supabase_key', supabaseKey); if (supabaseUrl && supabaseKey) { supabase.configure(supabaseUrl, supabaseKey); await loadFromSupabase(); } setShowSettings(false); };

  // Search
  const handleSearch = async () => {
    if (!searchQuery.trim()) { setSearchResults(null); return; }
    setIsSearching(true);
    try {
      if (supabase.isConfigured()) {
        const results = await supabase.searchDocuments(searchQuery);
        setSearchResults(results || []);
      } else {
        const q = searchQuery.toLowerCase();
        const results = documents.filter(d => d.title?.toLowerCase().includes(q) || d.content?.toLowerCase().includes(q) || d.summary?.toLowerCase().includes(q));
        setSearchResults(results);
      }
    } catch { setSearchResults([]); }
    setIsSearching(false);
  };

  // Merge selected docs
  const handleMerge = async () => {
    const key = apiKey || ENV_API_KEY;
    if (selectedDocs.length < 2 || !key) { if (!key && !ENV_API_KEY) setShowSettings(true); return; }
    setIsMerging(true);
    const selected = documents.filter(d => selectedDocs.includes(d.id));
    const content = selected.map((d, i) => `--- 记录${i + 1} (${d.title || d.date}) ---\n${d.content}`).join('\n\n');
    try {
      const result = await callDeepSeek(key, [{ role: 'user', content }], PROMPTS.merge.replace('{content}', content));
      setMergeResult(result);
      // Save merged result as new document
      const mergedDoc = { title: `合并分析 ${new Date().toLocaleDateString('zh-CN')}`, content: result, source_type: 'note', summary: '多条记录合并分析', tags: ['合并', '分析'] };
      if (supabase.isConfigured()) { await supabase.addDocument(mergedDoc); await loadFromSupabase(); }
      else { const newDocs = [{ id: Date.now(), ...mergedDoc, sourceType: 'note', date: new Date().toISOString().split('T')[0] }, ...documents]; setDocuments(newDocs); storage.set('tcm_documents', newDocs); }
    } catch (e: any) { setMergeResult(`❌ 合并失败：${e.message}`); }
    setIsMerging(false);
    setSelectedDocs([]);
  };

  // Acupoint finder - 提取穴位名称并显示图片
  const [foundAcupoints, setFoundAcupoints] = useState<string[]>([]);
  
  const handleFindAcupoint = async () => {
    const key = apiKey || ENV_API_KEY;
    if (!acupointQuery.trim() || !key) { if (!key && !ENV_API_KEY) setShowSettings(true); return; }
    setIsSearchingAcupoint(true);
    setFoundAcupoints([]);
    try {
      const result = await callDeepSeek(key, [{ role: 'user', content: acupointQuery }], PROMPTS.acupoint);
      setAcupointResult(result);
      
      // 提取穴位名称
      const acupointNames = Object.keys(ACUPOINT_IMAGES);
      const found = acupointNames.filter(name => result.includes(name));
      setFoundAcupoints(found);
    } catch (e: any) { setAcupointResult(`❌ 查找失败：${e.message}`); }
    setIsSearchingAcupoint(false);
  };

  // Guidance generator
  const handleGenerateGuidance = async () => {
    const key = apiKey || ENV_API_KEY;
    if (!guidanceQuery.trim() || !key) { if (!key && !ENV_API_KEY) setShowSettings(true); return; }
    setIsGeneratingGuidance(true);
    try {
      const result = await callDeepSeek(key, [{ role: 'user', content: guidanceQuery }], PROMPTS.guidance);
      setGuidanceResult(result);
    } catch (e: any) { setGuidanceResult(`❌ 生成失败：${e.message}`); }
    setIsGeneratingGuidance(false);
  };

  // 加载外部脚本（使用缓存避免重复加载）
  const loadScriptCache = useRef<{[key: string]: Promise<void> | null}>({});
  
  const loadScript = useCallback((src: string): Promise<void> => {
    const cached = loadScriptCache.current[src];
    if (cached) {
      return cached;
    }
    
    const promise = new Promise<void>((resolve, reject) => {
      // 检查是否已加载
      if (typeof window !== 'undefined') {
        const existing = document.querySelector(`script[src="${src}"]`);
        if (existing) {
          resolve();
          return;
        }
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
    
    loadScriptCache.current[src] = promise;
    return promise;
  }, []);

  // 处理文档导入 (PDF, DOCX, TXT)
  const handleDocumentImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    setIsProcessingDoc(true);
    setDocProgress(10);
    
    const fileName = file.name.toLowerCase();
    let extractedText = '';
    
    try {
      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        // 纯文本文件
        extractedText = await file.text();
        setDocProgress(100);
      } else if (fileName.endsWith('.pdf')) {
        // PDF 文件 - 使用 PDF.js
        setDocProgress(20);
        try {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
          setDocProgress(30);
          
          // @ts-ignore
          const pdfjsLib = window.pdfjsLib;
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          
          const arrayBuffer = await file.arrayBuffer();
          setDocProgress(40);
          
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          const textParts: string[] = [];
          
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
            if (pageText) textParts.push(`【第${i}页】\n${pageText}`);
            setDocProgress(40 + Math.round((i / numPages) * 55));
          }
          
          extractedText = textParts.join('\n\n');
          if (!extractedText.trim()) {
            alert('PDF可能是扫描版（图片），无法提取文字。\n\n建议使用"拍照识别"功能。');
            setIsProcessingDoc(false);
            setDocProgress(0);
            if (documentInputRef.current) documentInputRef.current.value = '';
            return;
          }
          setDocProgress(100);
        } catch (err) {
          console.error('PDF parsing error:', err);
          alert('PDF解析失败，请尝试使用"拍照识别"功能。');
          setIsProcessingDoc(false);
          setDocProgress(0);
          if (documentInputRef.current) documentInputRef.current.value = '';
          return;
        }
      } else if (fileName.endsWith('.docx')) {
        // Word DOCX 文件 - 使用 mammoth.js
        setDocProgress(20);
        try {
          await loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js');
          setDocProgress(40);
          
          const arrayBuffer = await file.arrayBuffer();
          setDocProgress(60);
          
          // @ts-ignore
          const result = await window.mammoth.extractRawText({ arrayBuffer });
          extractedText = result.value;
          
          if (!extractedText.trim()) {
            alert('Word文档内容为空或无法解析。');
            setIsProcessingDoc(false);
            setDocProgress(0);
            if (documentInputRef.current) documentInputRef.current.value = '';
            return;
          }
          setDocProgress(100);
        } catch (err) {
          console.error('DOCX parsing error:', err);
          alert('Word文档解析失败。\n\n建议：打开Word复制文字后粘贴。');
          setIsProcessingDoc(false);
          setDocProgress(0);
          if (documentInputRef.current) documentInputRef.current.value = '';
          return;
        }
      } else if (fileName.endsWith('.doc')) {
        alert('.doc 是旧版Word格式，无法解析。\n\n请用Word打开后另存为 .docx 格式。');
        setIsProcessingDoc(false);
        setDocProgress(0);
        if (documentInputRef.current) documentInputRef.current.value = '';
        return;
      } else {
        // 尝试作为文本读取
        extractedText = await file.text();
        setDocProgress(100);
      }
      
      if (extractedText.trim()) {
        const cleanText = extractedText
          .replace(/\r\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        setNewEntry(p => ({ 
          ...p, 
          title: p.title || file.name.replace(/\.[^/.]+$/, ''),
          content: p.content + (p.content ? '\n\n--- 导入内容 ---\n\n' : '') + cleanText
        }));
        alert(`✅ 成功导入 ${file.name}\n\n提取了约 ${cleanText.length} 个字符`);
      } else {
        alert('无法从文档中提取文本');
      }
    } catch (err) {
      console.error('Document processing error:', err);
      alert('文档处理失败');
    }
    
    setIsProcessingDoc(false);
    setDocProgress(0);
    if (documentInputRef.current) documentInputRef.current.value = '';
  }, [loadScript]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader(); reader.onload = (e) => setSelectedImage(e.target?.result as string); reader.readAsDataURL(file);
    setIsOCRing(true); setOcrProgress(0);
    try { const text = await performOCR(file, setOcrProgress); setNewEntry(p => ({ ...p, content: p.content + (p.content ? '\n\n' : '') + text.trim() })); } catch { alert('识别失败'); }
    setIsOCRing(false);
  };

  // 打开摄像头
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setCameraStream(stream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert('无法访问摄像头，请检查权限设置');
      console.error(err);
    }
  };

  // 关闭摄像头
  const closeCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  // 拍照
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setSelectedImage(imageDataUrl);
    closeCamera();
    
    // OCR识别
    setIsOCRing(true); setOcrProgress(0);
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      const text = await performOCR(file, setOcrProgress);
      setNewEntry(p => ({ ...p, content: p.content + (p.content ? '\n\n' : '') + text.trim() }));
    } catch { alert('识别失败'); }
    setIsOCRing(false);
  };

  // 打开舌象摄像头
  const openTongueCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setTongueStream(stream);
      setShowTongueCamera(true);
      setTimeout(() => {
        if (tongueVideoRef.current) {
          tongueVideoRef.current.srcObject = stream;
          tongueVideoRef.current.play();
        }
      }, 100);
    } catch (err) {
      alert('无法访问摄像头');
    }
  };

  // 关闭舌象摄像头
  const closeTongueCamera = () => {
    if (tongueStream) {
      tongueStream.getTracks().forEach(track => track.stop());
      setTongueStream(null);
    }
    setShowTongueCamera(false);
  };

  // 拍摄舌象
  const captureTongue = () => {
    if (!tongueVideoRef.current || !tongueCanvasRef.current) return;
    const video = tongueVideoRef.current;
    const canvas = tongueCanvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setDiagnosisForm(p => ({ ...p, tongueImage: imageDataUrl }));
    closeTongueCamera();
  };

  const toggleSymptom = (s: string) => setSelectedSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);
  const addCustomSymptom = () => { if (customSymptom.trim() && !selectedSymptoms.includes(customSymptom.trim())) { setSelectedSymptoms(p => [...p, customSymptom.trim()]); setCustomSymptom(''); } };

  const handleDiagnosis = async () => {
    if (selectedSymptoms.length === 0 && !diagnosisForm.voiceDesc) return;
    const key = apiKey || ENV_API_KEY;
    if (!key) { if (!ENV_API_KEY) setShowSettings(true); return; }
    setIsDiagnosing(true); setDiagnosisResult('');
    const latest = healthLogs[0];
    const msg = `症状：${selectedSymptoms.join('、') || '无'}\n语音描述：${diagnosisForm.voiceDesc || '无'}\n病程：${diagnosisForm.duration || '未知'}\n舌象：${diagnosisForm.tongue || '未知'}\n脉象：${diagnosisForm.pulse || '未知'}${latest ? `\n健康数据：步数${latest.steps || '-'} 心率${latest.heart_rate || '-'}` : ''}`;
    try {
      const result = await callDeepSeek(key, [{ role: 'user', content: msg }], PROMPTS.diagnosis);
      setDiagnosisResult(result + `\n\n---\n📅 ${new Date().toLocaleString('zh-CN')}`);
      if (supabase.isConfigured()) await supabase.addDiagnosisRecord({ symptoms: selectedSymptoms, voice_desc: diagnosisForm.voiceDesc, tongue: diagnosisForm.tongue, pulse: diagnosisForm.pulse, duration: diagnosisForm.duration, result });
    } catch (e: any) { setDiagnosisResult(`❌ 分析失败：${e.message}`); }
    setIsDiagnosing(false);
  };

  const handleSaveHealth = async () => {
    const log = { date: new Date().toISOString().split('T')[0], time: new Date().toTimeString().slice(0, 5), steps: healthData.steps ? parseInt(healthData.steps) : null, heart_rate: healthData.heartRate ? parseInt(healthData.heartRate) : null, systolic: healthData.systolic ? parseInt(healthData.systolic) : null, diastolic: healthData.diastolic ? parseInt(healthData.diastolic) : null, sleep: healthData.sleep ? parseFloat(healthData.sleep) : null, weight: healthData.weight ? parseFloat(healthData.weight) : null };
    if (supabase.isConfigured()) { try { await supabase.addHealthLog(log); await loadFromSupabase(); } catch { setHealthLogs(p => [{ id: Date.now(), ...log }, ...p]); } }
    else { const nl = [{ id: Date.now(), ...log }, ...healthLogs]; setHealthLogs(nl); storage.set('tcm_health_logs', nl); }
    setHealthData({ steps: '', heartRate: '', systolic: '', diastolic: '', sleep: '', weight: '' }); setShowHealthModal(false);
  };

  const handleSaveKnowledge = async () => {
    if (!newEntry.content.trim()) return;
    setIsSummarizing(true);
    let summary = newEntry.content.slice(0, 200) + '...';
    if (apiKey) { try { summary = await callDeepSeek(apiKey, [{ role: 'user', content: newEntry.content }], PROMPTS.summarize); } catch {} }
    const source = SOURCE_TYPES.find(s => s.id === newEntry.sourceType);
    const doc = { title: newEntry.title || `${source?.label} ${new Date().toLocaleDateString('zh-CN')}`, content: newEntry.content, source_type: newEntry.sourceType, summary, tags: newEntry.tags.split(/[,，]/).filter(t => t.trim()) };
    if (supabase.isConfigured()) { try { await supabase.addDocument(doc); await loadFromSupabase(); } catch { setDocuments(p => [{ id: Date.now(), ...doc, date: new Date().toISOString().split('T')[0] }, ...p]); } }
    else { const nd = [{ id: Date.now(), ...doc, sourceType: newEntry.sourceType, date: new Date().toISOString().split('T')[0] }, ...documents]; setDocuments(nd); storage.set('tcm_documents', nd); }
    setIsSummarizing(false); setNewEntry({ title: '', content: '', sourceType: 'wechat', tags: '' }); setSelectedImage(null);
  };

  const handleAsk = async () => {
    const key = apiKey || ENV_API_KEY;
    if (!inputText.trim() || !key) { if (!key && !ENV_API_KEY) setShowSettings(true); return; }
    setMessages(p => [...p, { role: 'user', content: inputText }]);
    const q = inputText; setInputText(''); setIsLoading(true);
    const knowledge = documents.slice(0, 10).map(d => `【${d.title}】\n${(d.content || '').slice(0, 500)}`).join('\n\n---\n\n') || '暂无';
    try { const ans = await callDeepSeek(key, [{ role: 'user', content: q }], PROMPTS.qa.replace('{knowledge}', knowledge)); setMessages(p => [...p, { role: 'assistant', content: ans }]); }
    catch (e: any) { setMessages(p => [...p, { role: 'assistant', content: `❌ ${e.message}` }]); }
    setIsLoading(false);
  };

  const handleVoice = (target: 'input' | 'diagnosis') => { setVoiceTarget(target); if (isListening) stopVoice(); else startVoice(); };
  const toggleDocSelect = (id: number) => setSelectedDocs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  // Styles
  const s: any = {
    container: { minHeight: '100vh', background: 'linear-gradient(180deg, #f5f0e8 0%, #ebe4d4 100%)', display: 'flex', flexDirection: 'column' },
    header: { background: 'linear-gradient(135deg, #8B4513 0%, #5D3A1A 100%)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    logo: { display: 'flex', alignItems: 'center', gap: 10 },
    logoText: { fontSize: 18, fontWeight: 600, color: '#fff' },
    logoSub: { fontSize: 10, color: '#d4b896' },
    iconBtn: { width: 34, height: 34, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    main: { flex: 1, overflow: 'auto', paddingBottom: 75 },
    page: { padding: 16 },
    pageTitle: { fontSize: 18, fontWeight: 600, color: '#5D3A1A', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
    section: { marginBottom: 14 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#5D3A1A', marginBottom: 6 },
    input: { width: '100%', padding: 10, border: '1px solid #d4c4a8', borderRadius: 8, fontSize: 14, background: 'white' },
    textarea: { width: '100%', padding: 10, border: '1px solid #d4c4a8', borderRadius: 8, fontSize: 14, background: 'white', resize: 'vertical', minHeight: 80, fontFamily: 'inherit' },
    sourceGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 },
    sourceCard: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 10, background: 'white', border: '2px solid #e8e0d0', borderRadius: 8, cursor: 'pointer', fontSize: 11 },
    voiceBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%', padding: 12, background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)', border: 'none', borderRadius: 8, color: 'white', fontSize: 14, cursor: 'pointer' },
    voiceBtnActive: { background: 'linear-gradient(135deg, #EF4444, #DC2626)' },
    uploadArea: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 30, background: 'white', border: '2px dashed #d4c4a8', borderRadius: 10, color: '#8B7355', cursor: 'pointer', gap: 6 },
    primaryBtn: { width: '100%', padding: 12, background: 'linear-gradient(135deg, #8B4513, #5D3A1A)', border: 'none', borderRadius: 8, color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
    secondaryBtn: { padding: '10px 16px', background: 'white', border: '1px solid #8B4513', borderRadius: 8, color: '#8B4513', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 },
    addBtn: { padding: '8px 14px', background: '#8B4513', border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 },
    result: { marginTop: 14, padding: 14, background: 'white', borderRadius: 10 },
    resultText: { fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' },
    list: { display: 'flex', flexDirection: 'column', gap: 6 },
    card: { background: 'white', borderRadius: 8, padding: 10, fontSize: 13 },
    cardSelectable: { cursor: 'pointer', border: '2px solid transparent' },
    cardSelected: { borderColor: '#8B4513', background: '#faf5f0' },
    empty: { textAlign: 'center', padding: 30, color: '#8B7355' },
    searchBox: { display: 'flex', gap: 8, marginBottom: 12 },
    symptomGrid: { display: 'flex', flexWrap: 'wrap', gap: 5 },
    symptomTag: { padding: '5px 10px', background: 'white', border: '1px solid #d4c4a8', borderRadius: 14, fontSize: 12, cursor: 'pointer' },
    symptomActive: { background: '#8B4513', borderColor: '#8B4513', color: 'white' },
    selectedTags: { display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, padding: 8, background: '#f5ebe0', borderRadius: 6 },
    selectedTag: { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '3px 8px', background: '#8B4513', color: 'white', borderRadius: 10, fontSize: 11 },
    removeTag: { background: 'none', border: 'none', color: 'white', cursor: 'pointer' },
    healthCard: { background: 'linear-gradient(135deg, #8B4513, #5D3A1A)', borderRadius: 14, padding: 14, color: 'white', marginBottom: 14 },
    healthGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 },
    healthItem: { textAlign: 'center' },
    healthValue: { fontSize: 18, fontWeight: 600 },
    healthLabel: { fontSize: 10, opacity: 0.8 },
    chatContainer: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', padding: 16 },
    chatHistory: { flex: 1, overflow: 'auto', marginBottom: 10 },
    message: { display: 'flex', gap: 6, marginBottom: 10 },
    userMsg: { justifyContent: 'flex-end' },
    assistantMsg: { justifyContent: 'flex-start' },
    avatar: { width: 26, height: 26, borderRadius: '50%', background: '#8B4513', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 },
    bubble: { maxWidth: '80%', padding: '8px 12px', borderRadius: 10, fontSize: 13 },
    userBubble: { background: '#8B4513', color: 'white', borderBottomRightRadius: 3 },
    assistantBubble: { background: 'white', borderBottomLeftRadius: 3 },
    msgText: { fontSize: 13, lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' },
    chatInput: { display: 'flex', gap: 6 },
    sendBtn: { width: 40, height: 40, borderRadius: '50%', background: '#8B4513', border: 'none', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    nav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: 'white', display: 'flex', justifyContent: 'space-around', padding: '6px 12px 20px', borderTop: '1px solid #e8e0d0' },
    navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, background: 'none', border: 'none', padding: '6px 10px', borderRadius: 8, color: '#999', cursor: 'pointer', fontSize: 10 },
    navActive: { color: '#8B4513', background: 'rgba(139,69,19,0.1)' },
    overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 },
    modal: { background: '#f5f0e8', borderRadius: '18px 18px 0 0', padding: 18, width: '100%', maxWidth: 500, maxHeight: '80vh', overflow: 'auto' },
    modalTitle: { fontSize: 16, textAlign: 'center', marginBottom: 14 },
    modalActions: { display: 'flex', gap: 10, marginTop: 14 },
    cancelBtn: { flex: 1, padding: 10, background: 'white', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer' },
    confirmBtn: { flex: 1, padding: 10, background: '#8B4513', border: 'none', borderRadius: 8, color: 'white', cursor: 'pointer' },
    tabs: { display: 'flex', gap: 8, marginBottom: 14, overflowX: 'auto' },
    tab: { padding: '8px 14px', background: 'white', border: '1px solid #d4c4a8', borderRadius: 20, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 },
    tabActive: { background: '#8B4513', borderColor: '#8B4513', color: 'white' },
    featureCard: { background: 'white', borderRadius: 12, padding: 14, marginBottom: 12 },
    featureTitle: { fontSize: 14, fontWeight: 600, color: '#5D3A1A', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 },
  };

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div style={s.logo}>
          <img src="/icons/icon-72x72.png" alt="" style={{ width: 36, height: 36, borderRadius: 8 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <div>
            <div style={s.logoText}>我的中医助手</div>
            <div style={s.logoSub}>
              {syncStatus === 'connected' ? '🟢 云同步' : '📱 本地'}
              {apiKey ? ' · AI就绪' : ''}
              {useEnvKeys ? ' · 已配置' : ''}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {supabase.isConfigured() && <button style={s.iconBtn} onClick={loadFromSupabase}><Icons.Refresh /></button>}
          {!useEnvKeys && <button style={s.iconBtn} onClick={() => setShowSettings(true)}><Icons.Settings /></button>}
        </div>
      </header>

      <main style={s.main}>
        {/* 录入页面 */}
        {activeTab === 'input' && (
          <div style={s.page}>
            <h2 style={s.pageTitle}><Icons.FolderOpen /> 资料收集</h2>
            
            {/* 搜索框 */}
            <div style={s.searchBox}>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索知识库..." style={{ ...s.input, flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
              <button style={s.addBtn} onClick={handleSearch}><Icons.Search /></button>
            </div>

            {/* 搜索结果 */}
            {searchResults !== null && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>搜索结果: {searchResults.length} 条</div>
                {searchResults.length > 0 ? (
                  <div style={s.list}>{searchResults.slice(0, 5).map((d, i) => (
                    <div key={d.id || i} style={s.card}>
                      <div style={{ fontWeight: 500, marginBottom: 4 }}>{d.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{(d.content || '').slice(0, 100)}...</div>
                    </div>
                  ))}</div>
                ) : <div style={{ color: '#999', fontSize: 13 }}>未找到相关内容</div>}
                <button style={{ ...s.secondaryBtn, marginTop: 8 }} onClick={() => setSearchResults(null)}>清除搜索</button>
              </div>
            )}

            {/* 来源选择 */}
            <div style={s.section}>
              <label style={s.label}>选择来源</label>
              <div style={s.sourceGrid}>
                {SOURCE_TYPES.map(src => (
                  <button key={src.id} style={{ ...s.sourceCard, ...(newEntry.sourceType === src.id ? { borderColor: src.color, background: `${src.color}10` } : {}) }} onClick={() => setNewEntry({ ...newEntry, sourceType: src.id })}>
                    <span style={{ color: src.color }}><src.icon /></span>
                    <span>{src.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 语音输入 */}
            {newEntry.sourceType === 'voice' && (
              <div style={s.section}>
                <button style={{ ...s.voiceBtn, ...(isListening ? s.voiceBtnActive : {}) }} onClick={() => handleVoice('input')} disabled={!voiceSupported}>
                  {isListening ? <><Icons.MicOff /> 停止</> : <><Icons.Mic /> 开始说话</>}
                </button>
              </div>
            )}

            {/* 拍照识别 - 打开摄像头 */}
            {newEntry.sourceType === 'camera' && (
              <div style={s.section}>
                {selectedImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={selectedImage} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
                    <button style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', cursor: 'pointer' }} onClick={() => setSelectedImage(null)}><Icons.X /></button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <button style={{ ...s.primaryBtn, background: 'linear-gradient(135deg, #10B981, #059669)' }} onClick={openCamera}>
                      <Icons.Camera /> 打开摄像头拍照
                    </button>
                    <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>或</div>
                    <button style={s.secondaryBtn} onClick={() => cameraInputRef.current?.click()}>
                      <Icons.Image /> 从相册选择
                    </button>
                  </div>
                )}
                <input ref={cameraInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                {isOCRing && <div style={{ marginTop: 8, padding: 10, background: '#fff8e1', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${ocrProgress}%`, height: '100%', background: '#10B981', transition: 'width 0.3s' }}></div>
                  </div>
                  <span>识别中 {ocrProgress}%</span>
                </div>}
              </div>
            )}

            {/* 文档导入 */}
            {newEntry.sourceType === 'document' && (
              <div style={s.section}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <button style={{ ...s.primaryBtn, background: 'linear-gradient(135deg, #F59E0B, #D97706)' }} onClick={() => documentInputRef.current?.click()}>
                    <Icons.Upload /> 选择文档导入
                  </button>
                  <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, fontSize: 12, lineHeight: 1.6 }}>
                    <div style={{ fontWeight: 600, marginBottom: 6, color: '#166534' }}>✅ 支持的格式：</div>
                    <div>• <strong>PDF</strong> - 电子版PDF可直接解析</div>
                    <div>• <strong>Word (.docx)</strong> - 自动提取文字</div>
                    <div>• <strong>文本 (.txt, .md)</strong> - 直接导入</div>
                    <div style={{ marginTop: 8, color: '#666', fontSize: 11 }}>
                      💡 扫描版PDF请使用"拍照识别"功能
                    </div>
                  </div>
                </div>
                <input ref={documentInputRef} type="file" accept=".pdf,.docx,.doc,.txt,.md" onChange={handleDocumentImport} style={{ display: 'none' }} />
                {isProcessingDoc && <div style={{ marginTop: 8, padding: 10, background: '#fff8e1', borderRadius: 6, fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${docProgress}%`, height: '100%', background: '#F59E0B', transition: 'width 0.3s' }}></div>
                  </div>
                  <span>解析中 {docProgress}%</span>
                </div>}
              </div>
            )}

            {/* 相册图片OCR */}
            {newEntry.sourceType === 'image' && (
              <div style={s.section}>
                {selectedImage ? (
                  <div style={{ position: 'relative' }}>
                    <img src={selectedImage} alt="" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 8 }} />
                    <button style={{ position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white' }} onClick={() => setSelectedImage(null)}><Icons.X /></button>
                  </div>
                ) : (
                  <div style={s.uploadArea} onClick={() => fileInputRef.current?.click()}><Icons.Image /><span>点击选择图片</span></div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
                {isOCRing && <div style={{ marginTop: 8, padding: 8, background: '#fff8e1', borderRadius: 6, fontSize: 12 }}>识别中 {ocrProgress}%</div>}
              </div>
            )}

            {/* 内容输入 */}
            <div style={s.section}>
              <input type="text" value={newEntry.title} onChange={e => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="标题（可选）" style={{ ...s.input, marginBottom: 8 }} />
              <textarea value={newEntry.content} onChange={e => setNewEntry({ ...newEntry, content: e.target.value })} placeholder="粘贴微信聊天记录或输入内容..." style={s.textarea} />
              <input type="text" value={newEntry.tags} onChange={e => setNewEntry({ ...newEntry, tags: e.target.value })} placeholder="标签（逗号分隔）" style={{ ...s.input, marginTop: 8 }} />
            </div>

            <button style={{ ...s.primaryBtn, opacity: newEntry.content.trim() ? 1 : 0.5 }} onClick={handleSaveKnowledge} disabled={!newEntry.content.trim() || isSummarizing}>
              {isSummarizing ? '保存中...' : <><Icons.Sparkles /> 智能保存</>}
            </button>

            {/* 知识库列表 + 合并功能 */}
            {documents.length > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0 10px' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: '#5D3A1A', display: 'flex', alignItems: 'center', gap: 6 }}><Icons.Book /> 知识库 ({documents.length})</h3>
                  {selectedDocs.length >= 2 && (
                    <button style={s.addBtn} onClick={handleMerge} disabled={isMerging}>
                      <Icons.Merge /> {isMerging ? '合并中...' : `合并 ${selectedDocs.length} 条`}
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>💡 点击选择多条记录进行合并分析</div>
                <div style={s.list}>
                  {documents.slice(0, 10).map((d, i) => (
                    <div key={d.id || i} style={{ ...s.card, ...s.cardSelectable, ...(selectedDocs.includes(d.id) ? s.cardSelected : {}) }} onClick={() => toggleDocSelect(d.id)}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: SOURCE_TYPES.find(x => x.id === (d.source_type || d.sourceType))?.color }}>{SOURCE_TYPES.find(x => x.id === (d.source_type || d.sourceType))?.label}</span>
                        <span style={{ fontSize: 11, color: '#999' }}>{d.date || d.created_at?.split('T')[0]}</span>
                      </div>
                      <div style={{ fontWeight: 500 }}>{d.title}</div>
                    </div>
                  ))}
                </div>
                {mergeResult && (
                  <div style={s.result}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#8B4513' }}>📋 合并分析结果</div>
                    <pre style={s.resultText}>{mergeResult}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 健康页面 */}
        {activeTab === 'health' && (
          <div style={s.page}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={s.pageTitle}><Icons.Heart /> 健康数据</h2>
              <button style={s.addBtn} onClick={() => setShowHealthModal(true)}><Icons.Plus /> 记录</button>
            </div>
            {healthLogs.length > 0 && (
              <div style={s.healthCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}><span>最新</span><span>{healthLogs[0].date}</span></div>
                <div style={s.healthGrid}>
                  {healthLogs[0].steps && <div style={s.healthItem}><div style={s.healthValue}>{healthLogs[0].steps}</div><div style={s.healthLabel}>步数</div></div>}
                  {healthLogs[0].heart_rate && <div style={s.healthItem}><div style={s.healthValue}>{healthLogs[0].heart_rate}</div><div style={s.healthLabel}>心率</div></div>}
                  {healthLogs[0].sleep && <div style={s.healthItem}><div style={s.healthValue}>{healthLogs[0].sleep}h</div><div style={s.healthLabel}>睡眠</div></div>}
                </div>
              </div>
            )}
            <div style={s.list}>{healthLogs.slice(0, 10).map((log, i) => (
              <div key={log.id || i} style={s.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{log.date}</span><span style={{ color: '#999' }}>{log.time}</span></div>
                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#666', marginTop: 4 }}>{log.steps && <span>👣{log.steps}</span>}{log.heart_rate && <span>❤️{log.heart_rate}</span>}{log.sleep && <span>🌙{log.sleep}h</span>}</div>
              </div>
            ))}</div>
          </div>
        )}

        {/* 问答页面 - 包含穴位和导引 */}
        {activeTab === 'chat' && (
          <div style={s.page}>
            <h2 style={s.pageTitle}><Icons.Chat /> 智能助手</h2>
            
            {/* 功能标签 */}
            <div style={s.tabs}>
              <button style={{ ...s.tab, ...s.tabActive }}><Icons.Chat /> 问答</button>
              <button style={s.tab} onClick={() => setActiveTab('acupoint')}><Icons.Target /> 穴位查找</button>
              <button style={s.tab} onClick={() => setActiveTab('guidance')}><Icons.Compass /> 导引策略</button>
            </div>

            {/* 问答区域 */}
            <div style={{ ...s.chatContainer, height: 'calc(100vh - 220px)', padding: 0 }}>
              <div style={s.chatHistory}>
                {messages.length === 0 ? (
                  <div style={s.empty}><Icons.Brain /><p>基于知识库问答</p><p style={{ fontSize: 12 }}>已收录 {documents.length} 条</p></div>
                ) : messages.map((m, i) => (
                  <div key={i} style={{ ...s.message, ...(m.role === 'user' ? s.userMsg : s.assistantMsg) }}>
                    {m.role === 'assistant' && <div style={s.avatar}><Icons.Leaf /></div>}
                    <div style={{ ...s.bubble, ...(m.role === 'user' ? s.userBubble : s.assistantBubble) }}><pre style={s.msgText}>{m.content}</pre></div>
                  </div>
                ))}
                {isLoading && <div style={{ ...s.message, ...s.assistantMsg }}><div style={s.avatar}><Icons.Leaf /></div><div style={{ ...s.bubble, ...s.assistantBubble }}>思考中...</div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div style={s.chatInput}>
                <textarea value={inputText} onChange={e => setInputText(e.target.value)} placeholder="输入问题..." style={{ ...s.input, flex: 1 }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); } }} />
                <button style={s.sendBtn} onClick={handleAsk}><Icons.Send /></button>
              </div>
            </div>
          </div>
        )}

        {/* 穴位查找页面 */}
        {activeTab === 'acupoint' && (
          <div style={s.page}>
            <h2 style={s.pageTitle}><Icons.Target /> 穴位查找</h2>
            
            <div style={s.tabs}>
              <button style={s.tab} onClick={() => setActiveTab('chat')}><Icons.Chat /> 问答</button>
              <button style={{ ...s.tab, ...s.tabActive }}><Icons.Target /> 穴位查找</button>
              <button style={s.tab} onClick={() => setActiveTab('guidance')}><Icons.Compass /> 导引策略</button>
            </div>

            <div style={s.featureCard}>
              <div style={s.featureTitle}><Icons.MapPin /> 描述您的症状</div>
              <textarea value={acupointQuery} onChange={e => setAcupointQuery(e.target.value)} placeholder="例如：肩颈酸痛、失眠多梦、消化不良、头痛..." style={{ ...s.textarea, minHeight: 60 }} />
              <button style={{ ...s.primaryBtn, marginTop: 10 }} onClick={handleFindAcupoint} disabled={!acupointQuery.trim() || isSearchingAcupoint}>
                {isSearchingAcupoint ? '查找中...' : <><Icons.Search /> 查找穴位</>}
              </button>
            </div>

            {/* 穴位图片展示 */}
            {foundAcupoints.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#5D3A1A', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icons.MapPin /> 穴位位置图示
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {foundAcupoints.map(name => {
                    const info = ACUPOINT_IMAGES[name];
                    if (!info) return null;
                    return (
                      <div key={name} style={{ background: 'white', borderRadius: 10, padding: 10, textAlign: 'center' }}>
                        <div style={{ width: '100%', height: 100, background: '#f5f0e8', borderRadius: 8, marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={info.image} alt={name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#8B4513' }}>{name}</div>
                        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>{info.location}</div>
                        <div style={{ fontSize: 10, color: '#888', marginTop: 4, lineHeight: 1.4 }}>{info.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {acupointResult && (
              <div style={s.result}>
                <pre style={s.resultText}>{acupointResult}</pre>
              </div>
            )}

            {/* 常用穴位速查 */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#5D3A1A', marginBottom: 8 }}>📍 常用穴位速查</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(ACUPOINT_IMAGES).slice(0, 10).map(name => (
                  <button key={name} style={{ padding: '4px 10px', background: 'white', border: '1px solid #d4c4a8', borderRadius: 12, fontSize: 11, cursor: 'pointer' }} onClick={() => { setAcupointQuery(name); }}>
                    {name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 导引策略页面 */}
        {activeTab === 'guidance' && (
          <div style={s.page}>
            <h2 style={s.pageTitle}><Icons.Compass /> 导引策略</h2>
            
            <div style={s.tabs}>
              <button style={s.tab} onClick={() => setActiveTab('chat')}><Icons.Chat /> 问答</button>
              <button style={s.tab} onClick={() => setActiveTab('acupoint')}><Icons.Target /> 穴位查找</button>
              <button style={{ ...s.tab, ...s.tabActive }}><Icons.Compass /> 导引策略</button>
            </div>

            <div style={s.featureCard}>
              <div style={s.featureTitle}><Icons.Zap /> 描述您的情况</div>
              <textarea value={guidanceQuery} onChange={e => setGuidanceQuery(e.target.value)} placeholder="例如：久坐办公腰酸背痛、气虚体质想增强体质、睡眠质量差..." style={{ ...s.textarea, minHeight: 60 }} />
              <button style={{ ...s.primaryBtn, marginTop: 10 }} onClick={handleGenerateGuidance} disabled={!guidanceQuery.trim() || isGeneratingGuidance}>
                {isGeneratingGuidance ? '生成中...' : <><Icons.Sparkles /> 生成导引方案</>}
              </button>
            </div>

            {guidanceResult && (
              <div style={s.result}>
                <pre style={s.resultText}>{guidanceResult}</pre>
              </div>
            )}
          </div>
        )}

        {/* 诊断页面 */}
        {activeTab === 'diagnosis' && (
          <div style={s.page}>
            <h2 style={s.pageTitle}><Icons.Stethoscope /> 病情分析</h2>
            
            {/* 语音描述 */}
            <div style={s.section}>
              <label style={s.label}>🎤 语音描述病情</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button style={{ ...s.voiceBtn, flex: 1, ...(isListening && voiceTarget === 'diagnosis' ? s.voiceBtnActive : {}) }} onClick={() => handleVoice('diagnosis')} disabled={!voiceSupported}>
                  {isListening && voiceTarget === 'diagnosis' ? <><Icons.MicOff /> 停止录音</> : <><Icons.Mic /> 点击说话</>}
                </button>
              </div>
              {isListening && voiceTarget === 'diagnosis' && <div style={{ textAlign: 'center', color: '#8B5CF6', fontSize: 12, marginBottom: 8 }}>🔴 正在聆听，请描述您的症状...</div>}
              <textarea value={diagnosisForm.voiceDesc} onChange={e => setDiagnosisForm({ ...diagnosisForm, voiceDesc: e.target.value })} placeholder="语音内容会显示在这里，也可以直接输入..." style={{ ...s.textarea, minHeight: 60 }} />
            </div>

            {/* 舌象拍照 */}
            <div style={s.section}>
              <label style={s.label}>👅 舌象采集</label>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                {diagnosisForm.tongueImage ? (
                  <div style={{ position: 'relative', width: 100, height: 100 }}>
                    <img src={diagnosisForm.tongueImage} alt="舌象" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                    <button style={{ position: 'absolute', top: -6, right: -6, width: 22, height: 22, borderRadius: '50%', background: '#EF4444', border: 'none', color: 'white', fontSize: 12, cursor: 'pointer' }} onClick={() => setDiagnosisForm(p => ({ ...p, tongueImage: '' }))}>×</button>
                  </div>
                ) : (
                  <button style={{ width: 100, height: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, background: '#fff', border: '2px dashed #d4c4a8', borderRadius: 8, color: '#8B7355', cursor: 'pointer', fontSize: 11 }} onClick={openTongueCamera}>
                    <Icons.Camera />
                    <span>拍摄舌象</span>
                  </button>
                )}
                <div style={{ flex: 1 }}>
                  <input type="text" value={diagnosisForm.tongue} onChange={e => setDiagnosisForm({ ...diagnosisForm, tongue: e.target.value })} placeholder="舌象描述（如：舌红苔黄）" style={{ ...s.input, marginBottom: 8 }} />
                  <input type="text" value={diagnosisForm.pulse} onChange={e => setDiagnosisForm({ ...diagnosisForm, pulse: e.target.value })} placeholder="脉象（如：弦数）" style={s.input} />
                </div>
              </div>
            </div>

            {/* 症状选择 */}
            <div style={s.section}>
              <label style={s.label}>选择症状</label>
              <div style={s.symptomGrid}>{COMMON_SYMPTOMS.map(sym => (<button key={sym} style={{ ...s.symptomTag, ...(selectedSymptoms.includes(sym) ? s.symptomActive : {}) }} onClick={() => toggleSymptom(sym)}>{sym}</button>))}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}><input type="text" value={customSymptom} onChange={e => setCustomSymptom(e.target.value)} placeholder="其他症状" style={{ ...s.input, flex: 1 }} onKeyDown={e => e.key === 'Enter' && addCustomSymptom()} /><button style={s.addBtn} onClick={addCustomSymptom}><Icons.Plus /></button></div>
              {selectedSymptoms.length > 0 && <div style={s.selectedTags}>{selectedSymptoms.map(sym => <span key={sym} style={s.selectedTag}>{sym}<button style={s.removeTag} onClick={() => toggleSymptom(sym)}>×</button></span>)}</div>}
            </div>

            {/* 病程 */}
            <div style={s.section}>
              <input type="text" value={diagnosisForm.duration} onChange={e => setDiagnosisForm({ ...diagnosisForm, duration: e.target.value })} placeholder="病程（如：3天、1周、1个月）" style={s.input} />
            </div>

            <button style={{ ...s.primaryBtn, opacity: (selectedSymptoms.length > 0 || diagnosisForm.voiceDesc) ? 1 : 0.5 }} onClick={handleDiagnosis} disabled={(selectedSymptoms.length === 0 && !diagnosisForm.voiceDesc) || isDiagnosing}>
              {isDiagnosing ? '分析中...' : <><Icons.Brain /> 开始辨证分析</>}
            </button>

            {diagnosisResult && <div style={s.result}><pre style={s.resultText}>{diagnosisResult}</pre></div>}
          </div>
        )}
      </main>

      {/* 底部导航 */}
      <nav style={s.nav}>
        {[{ id: 'input', icon: Icons.FolderOpen, label: '录入' }, { id: 'health', icon: Icons.Heart, label: '健康' }, { id: 'chat', icon: Icons.Chat, label: '助手' }, { id: 'diagnosis', icon: Icons.Stethoscope, label: '诊断' }].map(t => (
          <button key={t.id} style={{ ...s.navItem, ...(activeTab === t.id || (t.id === 'chat' && ['chat', 'acupoint', 'guidance'].includes(activeTab)) ? s.navActive : {}) }} onClick={() => setActiveTab(t.id)}><t.icon /><span>{t.label}</span></button>
        ))}
      </nav>

      {/* 设置弹窗 */}
      {showSettings && (
        <div style={s.overlay} onClick={() => setShowSettings(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>⚙️ 设置</h2>
            
            {useEnvKeys && (
              <div style={{ background: '#d4edda', padding: 12, borderRadius: 8, marginBottom: 14, fontSize: 12, color: '#155724' }}>
                ✅ API Key 已在后台配置，无需手动设置
              </div>
            )}
            
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.Key /> DeepSeek API Key</label>
              <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={useEnvKeys ? '已从后台配置' : 'sk-...'} style={s.input} disabled={!!ENV_API_KEY} />
              {!ENV_API_KEY && <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>获取：<a href="https://platform.deepseek.com" target="_blank" style={{ color: '#3B82F6' }}>platform.deepseek.com</a></p>}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ ...s.label, display: 'flex', alignItems: 'center', gap: 6 }}><Icons.Database /> Supabase 云同步</label>
              <input type="text" value={supabaseUrl} onChange={e => setSupabaseUrl(e.target.value)} placeholder={ENV_SUPABASE_URL ? '已从后台配置' : 'Project URL'} style={{ ...s.input, marginBottom: 6 }} disabled={!!ENV_SUPABASE_URL} />
              <input type="password" value={supabaseKey} onChange={e => setSupabaseKey(e.target.value)} placeholder={ENV_SUPABASE_KEY ? '已从后台配置' : 'anon public key'} style={s.input} disabled={!!ENV_SUPABASE_KEY} />
              {!ENV_SUPABASE_URL && <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>获取：<a href="https://supabase.com" target="_blank" style={{ color: '#3B82F6' }}>supabase.com</a> → Settings → API</p>}
            </div>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowSettings(false)}>关闭</button>
              {!useEnvKeys && <button style={s.confirmBtn} onClick={saveSettings}>保存</button>}
            </div>
          </div>
        </div>
      )}

      {/* 摄像头全屏界面 */}
      {showCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* 取景框指示 */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '85%', height: '60%', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 12 }}>
              <div style={{ position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTop: '3px solid #10B981', borderLeft: '3px solid #10B981', borderRadius: '8px 0 0 0' }}></div>
              <div style={{ position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTop: '3px solid #10B981', borderRight: '3px solid #10B981', borderRadius: '0 8px 0 0' }}></div>
              <div style={{ position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottom: '3px solid #10B981', borderLeft: '3px solid #10B981', borderRadius: '0 0 0 8px' }}></div>
              <div style={{ position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottom: '3px solid #10B981', borderRight: '3px solid #10B981', borderRadius: '0 0 8px 0' }}></div>
            </div>
            <div style={{ position: 'absolute', top: 20, left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 14, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              将笔记/资料对准取景框
            </div>
          </div>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, background: 'rgba(0,0,0,0.8)' }}>
            <button onClick={closeCamera} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>✕</button>
            <button onClick={capturePhoto} style={{ width: 70, height: 70, borderRadius: '50%', background: '#10B981', border: '4px solid white', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)' }}>
              <Icons.Camera />
            </button>
            <div style={{ width: 50 }}></div>
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* 舌象摄像头界面 */}
      {showTongueCamera && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#000', zIndex: 2000, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            <video ref={tongueVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            {/* 舌象取景框 - 椭圆形 */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '60%', height: '40%', border: '3px solid #EF4444', borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }}></div>
            <div style={{ position: 'absolute', top: '15%', left: 0, right: 0, textAlign: 'center', color: 'white', fontSize: 16, fontWeight: 500, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              👅 请伸出舌头，对准取景框
            </div>
            <div style={{ position: 'absolute', bottom: '25%', left: 0, right: 0, textAlign: 'center', color: '#ffcc00', fontSize: 12, textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
              提示：光线充足，自然伸舌，不要过度用力
            </div>
          </div>
          <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, background: 'rgba(0,0,0,0.9)' }}>
            <button onClick={closeTongueCamera} style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', fontSize: 24, cursor: 'pointer' }}>✕</button>
            <button onClick={captureTongue} style={{ width: 70, height: 70, borderRadius: '50%', background: '#EF4444', border: '4px solid white', color: 'white', cursor: 'pointer', boxShadow: '0 4px 15px rgba(239,68,68,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icons.Camera />
            </button>
            <div style={{ width: 50 }}></div>
          </div>
          <canvas ref={tongueCanvasRef} style={{ display: 'none' }} />
        </div>
      )}

      {/* 健康记录弹窗 */}
      {showHealthModal && (
        <div style={s.overlay} onClick={() => setShowHealthModal(false)}>
          <div style={s.modal} onClick={e => e.stopPropagation()}>
            <h2 style={s.modalTitle}>📝 记录健康数据</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div><label style={{ fontSize: 11 }}>👣 步数</label><input type="number" value={healthData.steps} onChange={e => setHealthData({ ...healthData, steps: e.target.value })} placeholder="8000" style={s.input} /></div>
              <div><label style={{ fontSize: 11 }}>❤️ 心率</label><input type="number" value={healthData.heartRate} onChange={e => setHealthData({ ...healthData, heartRate: e.target.value })} placeholder="72" style={s.input} /></div>
              <div><label style={{ fontSize: 11 }}>📊 收缩压</label><input type="number" value={healthData.systolic} onChange={e => setHealthData({ ...healthData, systolic: e.target.value })} placeholder="120" style={s.input} /></div>
              <div><label style={{ fontSize: 11 }}>📊 舒张压</label><input type="number" value={healthData.diastolic} onChange={e => setHealthData({ ...healthData, diastolic: e.target.value })} placeholder="80" style={s.input} /></div>
              <div><label style={{ fontSize: 11 }}>🌙 睡眠</label><input type="number" step="0.5" value={healthData.sleep} onChange={e => setHealthData({ ...healthData, sleep: e.target.value })} placeholder="7.5" style={s.input} /></div>
              <div><label style={{ fontSize: 11 }}>⚖️ 体重</label><input type="number" step="0.1" value={healthData.weight} onChange={e => setHealthData({ ...healthData, weight: e.target.value })} placeholder="65" style={s.input} /></div>
            </div>
            <div style={s.modalActions}>
              <button style={s.cancelBtn} onClick={() => setShowHealthModal(false)}>取消</button>
              <button style={s.confirmBtn} onClick={handleSaveHealth}>保存</button>
            </div>
          </div>
        </div>
      )}

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f0e8; } input:focus, textarea:focus { outline: none; border-color: #8B4513 !important; }`}</style>
    </div>
  );
}
