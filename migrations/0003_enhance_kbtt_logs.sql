-- Migration: 0003_enhance_kbtt_logs.sql
-- Description: Bổ sung các cột chẩn đoán nâng cao cho bảng kbtt_logs (error_class, outcome_unknown, timings, server fingerprints)

ALTER TABLE kbtt_logs ADD COLUMN error_class TEXT;
ALTER TABLE kbtt_logs ADD COLUMN outcome_unknown INTEGER DEFAULT 0;
ALTER TABLE kbtt_logs ADD COLUMN duration_ms INTEGER;
ALTER TABLE kbtt_logs ADD COLUMN ttfb_ms INTEGER;
ALTER TABLE kbtt_logs ADD COLUMN cf_ray TEXT;
ALTER TABLE kbtt_logs ADD COLUMN server_header TEXT;
ALTER TABLE kbtt_logs ADD COLUMN request_id TEXT;
ALTER TABLE kbtt_logs ADD COLUMN env TEXT;
ALTER TABLE kbtt_logs ADD COLUMN host TEXT;

CREATE INDEX IF NOT EXISTS idx_kbtt_logs_error_class ON kbtt_logs (error_class);
CREATE INDEX IF NOT EXISTS idx_kbtt_logs_outcome_unknown ON kbtt_logs (outcome_unknown);
