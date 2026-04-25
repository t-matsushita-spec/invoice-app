-- Settings テーブルの初期化スクリプト
-- 設定ページで読み込む初期レコードを挿入

-- 既存のレコードがあれば削除
DELETE FROM settings;

-- 初期設定レコードを挿入
INSERT INTO settings (
  company_name,
  owner_name,
  postal_code,
  address,
  phone,
  email,
  invoice_number,
  bank_info,
  next_invoice_seq,
  created_at,
  updated_at
) VALUES (
  'yudegital',                          -- company_name: 屋号
  '松下朋弘',                            -- owner_name: 代表者名
  '253-0042',                           -- postal_code: 郵便番号
  '神奈川県茅ヶ崎市本村1-1-1',          -- address: 住所
  '090-xxxx-xxxx',                      -- phone: 電話番号
  't-matsushita@yudegital.com',         -- email: メールアドレス
  'T1234567890123',                     -- invoice_number: インボイス登録番号
  '〇〇銀行 〇〇支店 普通 000000000',    -- bank_info: 振込先銀行口座
  1,                                    -- next_invoice_seq: 次の請求書番号
  NOW(),                                -- created_at
  NOW()                                 -- updated_at
);

-- 確認
SELECT * FROM settings;
