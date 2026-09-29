import { readFile, existsSync } from 'node:fs';
import postgres from 'postgres';

for (const file of ['.env.local', '.env']) if (existsSync(file)) process.loadEnvFile(file);
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL을 .env.local에 설정해 주세요.');
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, ssl: 'require', connect_timeout: 10 });
try {
  if (process.argv.includes('--check')) {
    await sql.unsafe('SELECT id, name FROM class_league.classrooms LIMIT 0');
    await sql.unsafe('SELECT token, class_id, role, expires FROM class_league.sessions LIMIT 0');
    await sql.unsafe('SELECT class_id, count, until FROM class_league.attempts LIMIT 0');
    console.log('Supabase 연결 및 필수 테이블 확인 완료');
  } else {
    const migration = await new Promise((resolve, reject) => readFile(new URL('../supabase/migrations/001_class_league.sql', import.meta.url), 'utf8', (error, content) => error ? reject(error) : resolve(content)));
    await sql.unsafe(migration);
    console.log('교실 리그 테이블 준비 완료');
  }
} catch (error) {
  // Never print a connection string or password in deployment logs.
  console.error('데이터베이스 준비 실패. 연결 정보와 프로젝트 상태를 확인해 주세요.', typeof error?.code === 'string' ? error.code : '');
  process.exitCode = 1;
} finally { await sql.end(); }
