import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { createStore, AccessError } from '../src/lib/store';
import type { Connection, DatabaseProvider } from '../src/lib/database';
import { adminAction } from '../src/lib/league';

test('PostgreSQL schema, password attempts, sessions, medals and rollback', async () => {
  const pg = new PGlite();
  try {
    const migration = await readFile(new URL('../supabase/migrations/001_class_league.sql', import.meta.url), 'utf8');
    await pg.exec(migration);
    await pg.exec(migration); // Safe to apply again without erasing records.
    const connection = (client: Pick<PGlite, 'query'>): Connection => ({
      query: async <T extends Record<string, unknown>>(sql: string, values: (string | number)[] = []) => (await client.query<T>(sql, values)).rows,
      prefix: 'class_league.', rowLock: ' FOR UPDATE', order: 'created_at, id',
    });
    const provider: DatabaseProvider = (operation, transaction = false) => transaction ? pg.transaction(tx => operation(connection(tx))) : operation(connection(pg));
    const store = createStore(provider);
    const classroom = await store.createClass('서버 검증 학급', 'test-pass-2026', Array.from({ length: 6 }, (_, i) => `예시 ${i + 1}`));
    assert.deepEqual(await store.catalog(), [{ id: classroom.id, name: classroom.name }]);
    assert.equal((await store.verifyPassword(classroom.id, 'test-pass-2026')).id, classroom.id);
    const kiosk = await store.createSession(classroom.id, 'kiosk');
    const admin = await store.createSession(classroom.id, 'admin');
    assert.equal((await store.session(kiosk.token, 'kiosk'))?.class_id, classroom.id);
    assert.equal(await store.session(kiosk.token, 'admin'), undefined);
    assert.equal(typeof (await store.session(admin.token, 'admin'))?.expires, 'number');
    await store.mutateClass(classroom.id, state => adminAction(state, 'createBadgeTemplate', { name: '함께한 도전', description: '참여를 기념합니다', color: '#c66f91' }));
    const saved = await store.getClass(classroom.id);
    await store.mutateClass(classroom.id, state => adminAction(state, 'praise', { templateId: saved.badgeTemplates[0].id, studentId: saved.students[0].id }));
    assert.equal((await store.getClass(classroom.id)).badges[0].color, '#c66f91');
    await assert.rejects(store.mutateClass(classroom.id, state => { state.name = 'rollback'; throw new Error('abort'); }));
    assert.equal((await store.getClass(classroom.id)).name, classroom.name);
    await store.revoke(admin.token);
    assert.equal(await store.session(admin.token, 'admin'), undefined);
    for (let i = 0; i < 8; i++) await assert.rejects(store.verifyPassword(classroom.id, 'wrong'), (error: unknown) => error instanceof AccessError && error.status === 401);
    await assert.rejects(store.verifyPassword(classroom.id, 'test-pass-2026'), (error: unknown) => error instanceof AccessError && error.status === 429);
    const attempts = await pg.query<{ count: number }>('SELECT count FROM class_league.attempts WHERE class_id=$1', [classroom.id]);
    assert.equal(attempts.rows[0].count, 8);
    // Anonymous API roles have neither schema nor table access.
    await pg.exec('CREATE ROLE anon; CREATE ROLE authenticated;');
    await pg.exec(migration);
    const permissions = await pg.query<{ allowed: boolean }>("SELECT has_schema_privilege('anon', 'class_league', 'USAGE') OR has_table_privilege('authenticated', 'class_league.classrooms', 'SELECT') AS allowed");
    assert.equal(permissions.rows[0].allowed, false);
  } finally { await pg.close(); }
});
