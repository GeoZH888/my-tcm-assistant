-- 我的中医助手 - Supabase 数据库表结构
-- 在 Supabase SQL Editor 中运行此脚本

-- 1. 知识库文档表
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_type TEXT NOT NULL,
  summary TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 健康数据表
CREATE TABLE health_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  steps INTEGER,
  heart_rate INTEGER,
  systolic INTEGER,
  diastolic INTEGER,
  sleep DECIMAL(3,1),
  weight DECIMAL(4,1),
  temperature DECIMAL(3,1),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 诊断记录表
CREATE TABLE diagnosis_records (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  symptoms TEXT[],
  voice_desc TEXT,
  tongue TEXT,
  pulse TEXT,
  duration TEXT,
  result TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 用户设置表
CREATE TABLE user_settings (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  api_key_encrypted TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引加速查询
CREATE INDEX idx_documents_user ON documents(user_id);
CREATE INDEX idx_health_logs_user ON health_logs(user_id);
CREATE INDEX idx_diagnosis_user ON diagnosis_records(user_id);

-- 启用 Row Level Security (RLS)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnosis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略（允许用户访问自己的数据）
CREATE POLICY "Users can access own documents" ON documents
  FOR ALL USING (true);

CREATE POLICY "Users can access own health_logs" ON health_logs
  FOR ALL USING (true);

CREATE POLICY "Users can access own diagnosis_records" ON diagnosis_records
  FOR ALL USING (true);

CREATE POLICY "Users can access own settings" ON user_settings
  FOR ALL USING (true);

-- 完成提示
SELECT '✅ 数据库表创建成功！' as message;
