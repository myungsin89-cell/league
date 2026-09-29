# GitHub · Vercel · Supabase 배포

- 저장소: [myungsin89-cell/league](https://github.com/myungsin89-cell/league)
- 웹앱과 접속 주소: Vercel, Node.js 24, 서울 함수 리전(`icn1`).
- 학급·경기·훈장·세션: Supabase PostgreSQL.
- 학생은 개인 계정 없이 공용 태블릿을 사용합니다.

## 1. Supabase 준비

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인하고 이 앱용 프로젝트를 만듭니다. 가능한 경우 서울 리전을 선택합니다.
2. 데이터베이스 비밀번호를 직접 설정합니다.
3. SQL Editor에서 `supabase/migrations/001_class_league.sql` 전체를 실행합니다. 다시 실행해도 기존 기록을 지우지 않습니다.
4. **Connect → Transaction pooler**에서 연결 문자열을 복사합니다. 포트는 `6543`이며, 비밀번호의 특수문자는 URL 인코딩합니다.

연결 문자열은 채팅이나 GitHub에 올리지 않습니다. 로컬에서 설정하려면 `.env.local`에 저장합니다.

```dotenv
DATABASE_URL=postgresql://postgres.PROJECT_REF:ENCODED_PASSWORD@POOLER_HOST:6543/postgres
```

위 문자열은 예시입니다. 실제 호스트와 사용자 이름은 Connect 화면의 값을 사용합니다. 브라우저로 노출되는 `NEXT_PUBLIC_` 변수는 사용하지 않습니다.

SQL Editor 대신 로컬에서 테이블을 준비할 수도 있습니다.

```powershell
npm.cmd run db:setup
npm.cmd run db:check
```

## 2. GitHub 업로드

앱 소스·잠금 파일·테이블 준비 SQL을 업로드합니다. `.env*`(예시 파일 제외), `data`, `node_modules`, `.next`, `.vercel`과 미리보기 이미지는 제외합니다.

## 3. Vercel 연결

1. [Vercel](https://vercel.com/new)에서 `myungsin89-cell/league`를 Import합니다.
2. 프레임워크는 Next.js, 루트 디렉터리는 저장소 루트, Node.js는 24.x를 사용합니다.
3. **Environment Variables**에 `DATABASE_URL`을 Production 환경에 저장합니다. Preview에서 확인하려면 별도 테스트 Supabase 프로젝트를 연결합니다.
4. Deploy합니다. 테이블 준비는 배포 전에 한 번 실행해야 합니다.
5. 이후 `main` 브랜치 업로드는 Vercel에서 자동 배포합니다.

Vercel에서는 HTTPS 전용 세션 쿠키를 자동 적용합니다. DB 클라이언트는 서버에서만 사용하며, Transaction pooler에 맞춰 `prepare: false`, 연결 수 `max: 1`, SSL을 사용합니다.

## 4. 배포 확인

- 공개 URL에서 새 학급을 만들고 교사 관리 잠금·해제를 확인합니다.
- 다른 태블릿을 같은 학급에 연결해 기록을 조회합니다.
- 경기 결과와 색상을 지정한 커스텀 훈장을 저장하고 재접속 후 확인합니다.
- 로그인하지 않은 기기에는 학생 명단·경기 기록·비밀번호 해시가 전달되지 않아야 합니다.
- 현재 로컬 체험 학급은 자동 업로드하지 않습니다. 실제 운영 학급은 배포 화면에서 생성합니다.

## 요금·운영

Vercel Hobby는 개인·비상업적 사용에 한정됩니다. Supabase Free의 프로젝트 수·용량·일시 중지 조건은 서비스 요금제에서 확인합니다. 학급 기록은 교사 관리에서 JSON으로 내보낼 수 있으며, 장기 백업은 Supabase의 백업 기능과 함께 준비합니다.

공식 안내: [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Node.js 버전](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Supabase 연결](https://supabase.com/docs/guides/database/connecting-to-postgres), [Supabase 요금제](https://supabase.com/pricing).

이 문서는 배포 절차입니다. 실제 배포 완료 여부와 공개 주소는 작업 결과에서 별도로 확인합니다.
