// Run migrations against MySQL directly - one at a time
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3306,
  user: 'zuhair',
  password: '13201',
  database: 'vox_dev',
  waitForConnections: true,
  connectionLimit: 5,
});

const statements = [
  `CREATE TABLE IF NOT EXISTS serverrole (
    id VARCHAR(36) PRIMARY KEY,
    serverId VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#5865f2',
    hoist BOOLEAN NOT NULL DEFAULT FALSE,
    position INT NOT NULL DEFAULT 0,
    permissions BIGINT NOT NULL DEFAULT 0,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_serverrole_server (serverId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS servermemberrole (
    id VARCHAR(36) PRIMARY KEY,
    serverMemberId VARCHAR(36) NOT NULL,
    roleId VARCHAR(36) NOT NULL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_member_role (serverMemberId, roleId),
    INDEX idx_smrole_member (serverMemberId),
    INDEX idx_smrole_role (roleId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `ALTER TABLE user ADD COLUMN loginAttempts INT NOT NULL DEFAULT 0`,
  `ALTER TABLE user ADD COLUMN lockedUntil DATETIME NULL`,
  `ALTER TABLE user ADD COLUMN lastLoginAt DATETIME NULL`,

  `ALTER TABLE refreshtoken ADD COLUMN deviceInfo VARCHAR(255) NULL`,

  `ALTER TABLE user ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'MEMBER'`,
  `ALTER TABLE user ADD COLUMN color VARCHAR(7) NOT NULL DEFAULT '#5865f2'`,

  // Set zuhair as FOUNDER and assign a distinctive color
  `UPDATE user SET role = 'FOUNDER', color = '#c91a5a' WHERE username = 'zuhair'`,
  `UPDATE user SET role = 'MEMBER' WHERE role IS NULL OR role = ''`,

  // Seed FOUNDER serverrole for zuhair with full permissions (all bits set)
  `INSERT IGNORE INTO serverrole (id, serverId, name, color, hoist, position, permissions)
   SELECT 'founder-role-vox-main', 'vox-main', 'FOUNDER', '#c91a5a', TRUE, 0, 18446744073709551615
   WHERE NOT EXISTS (SELECT 1 FROM serverrole WHERE id = 'founder-role-vox-main')`,

  `INSERT IGNORE INTO serverrole (id, serverId, name, color, hoist, position, permissions)
   SELECT 'founder-role-dc', 'cmr716a370003ufvk0z49ukel', 'FOUNDER', '#c91a5a', TRUE, 0, 18446744073709551615
   WHERE NOT EXISTS (SELECT 1 FROM serverrole WHERE id = 'founder-role-dc')`,

  `INSERT IGNORE INTO serverrole (id, serverId, name, color, hoist, position, permissions)
   SELECT 'founder-role-sd', 'cmr71jk3u0001ufe8mbpliif4', 'FOUNDER', '#c91a5a', TRUE, 0, 18446744073709551615
   WHERE NOT EXISTS (SELECT 1 FROM serverrole WHERE id = 'founder-role-sd')`,
  `ALTER TABLE refreshtoken ADD COLUMN ipAddress VARCHAR(45) NULL`,
  `ALTER TABLE refreshtoken ADD COLUMN userAgent TEXT NULL`,

  `CREATE TABLE IF NOT EXISTS report (
    id VARCHAR(36) PRIMARY KEY,
    reporterId VARCHAR(36) NOT NULL,
    reportedUserId VARCHAR(36) NULL,
    messageId VARCHAR(36) NULL,
    serverId VARCHAR(36) NULL,
    type ENUM('user','message','server') NOT NULL,
    reason ENUM('spam','harassment','inappropriate','unsafe','other') NOT NULL,
    details TEXT NULL,
    status ENUM('pending','reviewed','resolved','dismissed') NOT NULL DEFAULT 'pending',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_report_status (status),
    INDEX idx_report_reporter (reporterId),
    INDEX idx_report_reported (reportedUserId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS messageread (
    id VARCHAR(36) PRIMARY KEY,
    messageId VARCHAR(36) NOT NULL,
    userId VARCHAR(36) NOT NULL,
    readAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_msg_user (messageId, userId),
    INDEX idx_mr_message (messageId),
    INDEX idx_mr_user (userId)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

async function run() {
  const conn = await pool.getConnection();
  try {
    console.log('Running migrations...\n');
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log('OK:', stmt.substring(0, 80));
      } catch(e) {
        if (e.code === 'ER_DUP_FIELDNAME') { console.log('SKIP (exists):', stmt.substring(0, 50)); }
        else if (e.code === 'ER_TABLE_EXISTS_ERROR') { console.log('SKIP (table exists):', stmt.substring(0, 50)); }
        else if (e.code === 'ER_COLUMN_EXISTS') { console.log('SKIP (column exists):', stmt.substring(0, 50)); }
        else { console.error('ERR:', e.code, e.message.substring(0, 80)); }
      }
    }
    console.log('\n--- Done. Current tables: ---');
    const [rows] = await conn.query('SHOW TABLES');
    console.log(rows.map(r => Object.values(r)[0]).join(', '));
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch(e => { console.error(e); process.exit(1); });
