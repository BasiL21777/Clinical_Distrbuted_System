CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255), 
    github_id VARCHAR(100) UNIQUE,
    google_id VARCHAR(100) UNIQUE,
    auth_provider VARCHAR(50) DEFAULT 'local', -- العمود الجديد
    role VARCHAR(50) DEFAULT 'patient',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. بيانات تجريبية (Password: password123)
INSERT INTO users (full_name, email, hashed_password, role)
VALUES 
('Admin One',    'admin1@med.com',   '$2b$12$9q.eby1obQ883AhPvEP4R.liA4EAuxaFubBxNwv.uPgGZHfb1WMoa', 'admin'),
('Admin Two',    'admin2@med.com',   '$2b$12$9q.eby1obQ883AhPvEP4R.liA4EAuxaFubBxNwv.uPgGZHfb1WMoa', 'admin'),
('Patient One',    'patient1@med.com',   '$2b$12$9q.eby1obQ883AhPvEP4R.liA4EAuxaFubBxNwv.uPgGZHfb1WMoa', 'patient'),
('Doctor One',    'doctor1@med.com',   '$2b$12$9q.eby1obQ883AhPvEP4R.liA4EAuxaFubBxNwv.uPgGZHfb1WMoa', 'doctor')
ON CONFLICT (email) DO NOTHING;

-- 3. جدول السجلات (System Logs)
CREATE TABLE IF NOT EXISTS system_logs (
    id BIGSERIAL PRIMARY KEY,
    service_name VARCHAR(255) NOT NULL,
    user_id INTEGER,
    user_role VARCHAR(50),
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255),
    resource_id VARCHAR(255),
    method VARCHAR(10) NOT NULL,
    endpoint TEXT NOT NULL,
    ip_address VARCHAR(50),
    user_agent TEXT,
    status_code INTEGER NOT NULL,
    details TEXT,
    success BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- الفهارس لتحسين سرعة البحث (Indexes)
CREATE INDEX IF NOT EXISTS idx_service_name ON system_logs(service_name);
CREATE INDEX IF NOT EXISTS idx_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_action ON system_logs(action);
CREATE INDEX IF NOT EXISTS idx_status_code ON system_logs(status_code);
CREATE INDEX IF NOT EXISTS idx_created_at ON system_logs(created_at);