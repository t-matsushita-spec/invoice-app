const fs = require('fs');
const path = require('path');

// 認証チェックが必要なページたち
const protectedPages = [
  'app/invoices/page.tsx',
  'app/invoices/new/page.tsx',
  'app/invoices/[id]/page.tsx',
  'app/invoices/[id]/edit/page.tsx',
  'app/clients/page.tsx',
  'app/clients/new/page.tsx',
  'app/clients/[id]/edit/page.tsx',
  'app/settings/page.tsx',
];

const authCheckCode = `import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// 認証チェック
async function requireAuth() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    redirect('/auth/login')
  }
  return user
}
`;

protectedPages.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⏭️  ${filePath} はスキップ（存在しません）`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf-8');

  // 既に認証チェックがあるか確認
  if (content.includes('requireAuth') || content.includes('getUser')) {
    console.log(`⏭️  ${filePath} はスキップ（既に認証チェックあり）`);
    return;
  }

  // 最初の関数定義の前に認証チェック関数を挿入
  const functionMatch = content.match(/^(export\s+(default\s+)?(async\s+)?function|export\s+const\s+\w+\s+=\s+(async\s+)?\()/m);

  if (!functionMatch) {
    console.log(`⏭️  ${filePath} はスキップ（関数定義が見つかりません）`);
    return;
  }

  // インポート部分と関数定義部分を分離
  const imports = content.substring(0, functionMatch.index);
  const rest = content.substring(functionMatch.index);

  // supabase のインポートが既にあるか確認
  let newImports = imports;
  if (!imports.includes("from '@/lib/supabase/server'")) {
    newImports = imports.replace(
      /^/,
      `import { redirect } from 'next/navigation'\nimport { createClient } from '@/lib/supabase/server'\n\n`
    );
  } else if (!imports.includes("from 'next/navigation'")) {
    newImports = imports.replace(
      /^/,
      `import { redirect } from 'next/navigation'\n`
    );
  }

  // 関数の最初に認証チェックを追加
  const newRest = rest.replace(
    /^(export\s+(default\s+)?(async\s+)?function\s+\w+\s*\([^)]*\)\s*\{)/m,
    (match) => {
      return match + '\n  const user = await requireAuth()\n';
    }
  ).replace(
    /^(export\s+const\s+\w+\s+=\s+(async\s+)?\([^)]*\)\s*=>\s*\{)/m,
    (match) => {
      return match + '\n  const user = await requireAuth()\n';
    }
  );

  // requireAuth 関数を追加（まだない場合）
  let finalContent = newImports + '\n' + (newImports.includes('requireAuth') ? '' : authCheckCode + '\n') + newRest;

  fs.writeFileSync(fullPath, finalContent, 'utf-8');
  console.log(`✅ ${filePath} を更新しました`);
});

console.log('\n完了！');
