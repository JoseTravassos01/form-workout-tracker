export interface AuthUserRow {
  id: string;
  username: string;
  password_hash: string;
  active: number;
}

export interface AuthSessionRow {
  session_id: string;
  user_id: string;
  athlete_profile_id: string;
  sex: "male" | "female";
  expires_at: string;
}

export interface LoginAttemptRow {
  key_hash: string;
  attempts: number;
  window_started_at: string;
  blocked_until: string | null;
}

export class AuthRepository {
  constructor(private readonly database: D1Database) {}

  findUserByUsername(username: string): Promise<AuthUserRow | null> {
    return this.database.prepare("SELECT id,username,password_hash,active FROM users WHERE username=? LIMIT 1").bind(username).first<AuthUserRow>();
  }

  getLoginAttempt(keyHash: string): Promise<LoginAttemptRow | null> {
    return this.database.prepare("SELECT key_hash,attempts,window_started_at,blocked_until FROM login_attempts WHERE key_hash=?").bind(keyHash).first<LoginAttemptRow>();
  }

  async recordFailedLogin(keyHash: string, now: string, blockedUntil: string | null, resetWindow: boolean): Promise<void> {
    await this.database.prepare(`INSERT INTO login_attempts (key_hash,attempts,window_started_at,blocked_until,updated_at) VALUES (?,1,?,?,?)
      ON CONFLICT(key_hash) DO UPDATE SET attempts=CASE WHEN ? THEN 1 ELSE login_attempts.attempts+1 END,window_started_at=CASE WHEN ? THEN excluded.window_started_at ELSE login_attempts.window_started_at END,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at`)
      .bind(keyHash, now, blockedUntil, now, resetWindow ? 1 : 0, resetWindow ? 1 : 0).run();
  }

  async clearLoginAttempts(keyHash: string): Promise<void> {
    await this.database.prepare("DELETE FROM login_attempts WHERE key_hash=?").bind(keyHash).run();
  }

  async createSession(input: { id: string; userId: string; tokenHash: string; expiresAt: string; now: string; userAgentHash: string | null }): Promise<void> {
    await this.database.batch([
      this.database.prepare("DELETE FROM sessions WHERE user_id=? AND expires_at<=?").bind(input.userId, input.now),
      this.database.prepare("INSERT INTO sessions (id,user_id,token_hash,expires_at,last_used_at,user_agent_hash) VALUES (?,?,?,?,?,?)")
        .bind(input.id, input.userId, input.tokenHash, input.expiresAt, input.now, input.userAgentHash),
    ]);
  }

  validateSession(tokenHash: string, now: string): Promise<AuthSessionRow | null> {
    return this.database.prepare(`SELECT s.id session_id,s.user_id,p.id athlete_profile_id,p.sex,s.expires_at
      FROM sessions s JOIN users u ON u.id=s.user_id JOIN athlete_profiles p ON p.user_id=u.id
      WHERE s.token_hash=? AND s.expires_at>? AND u.active=1 LIMIT 1`).bind(tokenHash, now).first<AuthSessionRow>();
  }

  async touchSession(sessionId: string, now: string): Promise<void> {
    await this.database.prepare("UPDATE sessions SET last_used_at=? WHERE id=?").bind(now, sessionId).run();
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.database.prepare("DELETE FROM sessions WHERE id=?").bind(sessionId).run();
  }
}
