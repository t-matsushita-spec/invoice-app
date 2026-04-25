#!/usr/bin/env python3
import os
import sys
from pathlib import Path
from supabase import create_client, Client
import json

# .env.local をロード（環境変数として使用）
env_path = Path(__file__).parent / '.env.local'
if env_path.exists():
    with open(env_path, encoding='utf-8') as f:
        for line in f:
            if line.startswith('#') or not line.strip():
                continue
            key, value = line.strip().split('=', 1)
            os.environ[key] = value.strip('"\'')

# 環境変数から Supabase 認証情報を取得
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_KEY = os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("エラー: 環境変数が設定されていません")
    print("NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください")
    sys.exit(1)

# Supabase クライアントを作成
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

try:
    print("=" * 60)
    print("settings テーブルのデータ確認")
    print("=" * 60)

    # settings テーブルのすべてのレコードを取得
    response = supabase.table('settings').select('*').execute()

    if response.data:
        print(f"\n✅ {len(response.data)} 件のレコードが見つかりました\n")
        for record in response.data:
            print(json.dumps(record, ensure_ascii=False, indent=2))
    else:
        print("\n❌ settings テーブルは空です\n")
        print("対応方法:")
        print("  1. settings-init.sql を実行してデータを挿入")
        print("  2. または Supabase ダッシュボードで手動で作成")

except Exception as e:
    print(f"\n❌ エラー: {str(e)}")
    sys.exit(1)
