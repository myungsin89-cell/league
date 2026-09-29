import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { Classroom, DEFAULT_BADGE_COLOR, RuleError, newClass, text } from './league';
import { DatabaseProvider, withDatabase } from './database';
export { db } from './database';

type ClassRow = { id: string; name: string; salt: string; password: string; state: string };
type SessionRow = { token: string; class_id: string; role: 'kiosk' | 'admin'; expires: number };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export class AccessError extends Error { constructor(message: string, public status = 401) { super(message); } }
function readClassState(value: string): Classroom {
  const state = JSON.parse(value) as Classroom;
  // Keep older awards and make their designs reusable.
  if (!state.badgeTemplates) {
    state.badgeTemplates = [];
    for (const badge of state.badges.filter(b => b.kind === 'praise')) {
      let template = state.badgeTemplates.find(t => t.name === badge.name && t.description === badge.description);
      if (!template) {
        template = { id: `legacy-${badge.id}`, name: badge.name, description: badge.description, color: badge.color || DEFAULT_BADGE_COLOR, at: badge.at };
        state.badgeTemplates.push(template);
      }
      badge.templateId = template.id;
    }
  }
  for (const template of state.badgeTemplates) template.color ??= DEFAULT_BADGE_COLOR;
  return state;
}
function passwordHash(password: string, salt: string) { return scryptSync(password, salt, 64).toString('hex'); }
function checkPasswordShape(password: unknown): string {
  if (typeof password !== 'string' || password.length < 4 || password.length > 128) throw new RuleError('교사 비밀번호는 4~128자로 입력해 주세요.');
  return password;
}

export function createStore(database: DatabaseProvider) {
  return {
    catalog: () => database(async ({ query, prefix, order }) => query<{ id: string; name: string }>(`SELECT id, name FROM ${prefix}classrooms ORDER BY ${order}`)),
    getClass: (id: string) => database(async ({ query, prefix }) => {
      const [row] = await query<{ state: string }>(`SELECT state FROM ${prefix}classrooms WHERE id = $1`, [id]);
      if (!row) throw new AccessError('학급을 찾을 수 없습니다.');
      return readClassState(row.state);
    }),
    createClass: (name: unknown, password: unknown, names: unknown) => database(async ({ query, prefix }) => {
      const pass = checkPasswordShape(password);
      const state = newClass(text(name, '학급 이름', 50), names as string[]);
      const salt = randomBytes(16).toString('hex');
      await query(`INSERT INTO ${prefix}classrooms(id, name, salt, password, state) VALUES($1,$2,$3,$4,$5)`, [state.id, state.name, salt, passwordHash(pass, salt), JSON.stringify(state)]);
      return state;
    }),
    verifyPassword: async (classId: unknown, password: unknown) => {
      if (typeof classId !== 'string' || typeof password !== 'string' || password.length > 128) throw new AccessError('학급과 비밀번호를 확인해 주세요.');
      const result = await database(async ({ query, prefix, rowLock }) => {
        // Lock the class so simultaneous attempts cannot bypass the retry limit.
        const [row] = await query<ClassRow>(`SELECT * FROM ${prefix}classrooms WHERE id = $1${rowLock}`, [classId]);
        if (!row) return new AccessError('학급과 비밀번호를 확인해 주세요.');
        const [attempt] = await query<{ count: number; until: number }>(`SELECT count, until FROM ${prefix}attempts WHERE class_id = $1`, [classId]);
        const now = Date.now();
        if (attempt && attempt.count >= 8 && Number(attempt.until) > now) return new AccessError('비밀번호 입력이 여러 번 틀렸습니다. 5분 후 다시 시도해 주세요.', 429);
        const actual = Buffer.from(passwordHash(password, row.salt), 'hex');
        const expected = Buffer.from(row.password, 'hex');
        if (!timingSafeEqual(actual, expected)) {
          const count = attempt && Number(attempt.until) > now ? attempt.count + 1 : 1;
          await query(`INSERT INTO ${prefix}attempts(class_id,count,until) VALUES($1,$2,$3) ON CONFLICT(class_id) DO UPDATE SET count=excluded.count,until=excluded.until`, [classId, count, now + 300000]);
          return new AccessError('교사 비밀번호가 맞지 않습니다.');
        }
        await query(`DELETE FROM ${prefix}attempts WHERE class_id = $1`, [classId]);
        return readClassState(row.state);
      }, true);
      // Failed attempts must commit before returning the authentication error.
      if (result instanceof AccessError) throw result;
      return result;
    },
    createSession: (classId: string, role: 'kiosk' | 'admin') => database(async ({ query, prefix }) => {
      const token = randomBytes(32).toString('hex');
      const seconds = role === 'admin' ? 15 * 60 : 90 * 86400;
      await query(`DELETE FROM ${prefix}sessions WHERE expires < $1`, [Date.now()]);
      await query(`INSERT INTO ${prefix}sessions(token,class_id,role,expires) VALUES($1,$2,$3,$4)`, [hashToken(token), classId, role, Date.now() + seconds * 1000]);
      return { token, seconds };
    }),
    session: async (token: string | undefined, role: 'kiosk' | 'admin') => {
      if (!token || !/^[a-f0-9]{64}$/.test(token)) return undefined;
      return database(async ({ query, prefix }) => {
        const [row] = await query<SessionRow>(`SELECT * FROM ${prefix}sessions WHERE token = $1 AND role = $2 AND expires > $3`, [hashToken(token), role, Date.now()]);
        return row ? { ...row, expires: Number(row.expires) } : undefined;
      });
    },
    revoke: async (token: string | undefined) => {
      if (token) await database(async ({ query, prefix }) => { await query(`DELETE FROM ${prefix}sessions WHERE token = $1`, [hashToken(token)]); });
    },
    mutateClass: <T>(classId: string, mutation: (state: Classroom) => T): Promise<{ state: Classroom; result: T }> => database(async ({ query, prefix, rowLock }) => {
      const [row] = await query<{ state: string }>(`SELECT state FROM ${prefix}classrooms WHERE id = $1${rowLock}`, [classId]);
      if (!row) throw new AccessError('학급을 찾을 수 없습니다.');
      const state = readClassState(row.state);
      const result = mutation(state);
      await query(`UPDATE ${prefix}classrooms SET state = $1, name = $2 WHERE id = $3`, [JSON.stringify(state), state.name, classId]);
      return { state, result };
    }, true),
  };
}

export const { catalog, getClass, createClass, verifyPassword, createSession, session, revoke, mutateClass } = createStore(withDatabase);
