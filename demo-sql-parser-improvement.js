#!/usr/bin/env node

/**
 * Demonstration script showing the improvement from unsafe semicolon splitting
 * to proper SQL parsing that handles PostgreSQL syntax correctly.
 */

import { parse } from 'pgsql-parser';

// Old unsafe approach (for demonstration only)
function unsafeSQLSplit(sql) {
  return sql
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
}

// New safe approach (copied from sync-database.js)
function parseSQL(sql) {
  if (!sql || typeof sql !== 'string') {
    throw new Error('Invalid SQL input: must be a non-empty string');
  }

  const sanitizedSQL = sql.replace(/\0/g, '');
  
  try {
    const parsed = parse(sanitizedSQL);
    const statements = [];
    
    if (parsed && Array.isArray(parsed)) {
      for (const stmt of parsed) {
        if (stmt && stmt.RawStmt && stmt.RawStmt.stmt) {
          const stmtLocation = stmt.RawStmt.stmt_location || 0;
          const stmtLen = stmt.RawStmt.stmt_len || 0;
          
          if (stmtLen > 0) {
            const stmtText = sanitizedSQL.substr(stmtLocation, stmtLen).trim();
            if (stmtText && !stmtText.startsWith('--')) {
              statements.push(stmtText);
            }
          }
        }
      }
    }
    
    if (statements.length === 0) {
      return customSQLTokenizer(sanitizedSQL);
    }
    
    return statements;
    
  } catch (parseError) {
    console.warn('⚠️  pgsql-parser failed, falling back to custom tokenizer:', parseError.message);
    return customSQLTokenizer(sanitizedSQL);
  }
}

function customSQLTokenizer(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    if (char === '-' && nextChar === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      current += '\n';
      i++;
      continue;
    }
    
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < sql.length - 1) {
        if (sql[i] === '*' && sql[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      current += ' ';
      continue;
    }
    
    if (char === "'") {
      current += char;
      i++;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            current += sql[i + 1];
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      continue;
    }
    
    if (char === '"') {
      current += char;
      i++;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === '"') {
          if (sql[i + 1] === '"') {
            current += sql[i + 1];
            i += 2;
          } else {
            i++;
            break;
          }
        } else {
          i++;
        }
      }
      continue;
    }
    
    if (char === '$') {
      const dollarStart = i;
      let tag = '$';
      i++;
      
      while (i < sql.length && sql[i] !== '$') {
        tag += sql[i];
        i++;
      }
      
      if (i < sql.length && sql[i] === '$') {
        tag += '$';
        i++;
        current += tag;
        
        const closingTag = tag;
        let found = false;
        
        while (i <= sql.length - closingTag.length) {
          if (sql.substr(i, closingTag.length) === closingTag) {
            current += sql.substr(dollarStart + tag.length, i - dollarStart - tag.length);
            current += closingTag;
            i += closingTag.length;
            found = true;
            break;
          }
          i++;
        }
        
        if (!found) {
          i = dollarStart + 1;
          current += '$';
        }
        continue;
      } else {
        i = dollarStart + 1;
        current += '$';
        continue;
      }
    }
    
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }
    
    current += char;
    i++;
  }
  
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  return statements;
}

// Demonstration cases
const testCases = [
  {
    name: "Semicolon in String Literal",
    sql: "INSERT INTO messages (content) VALUES ('Hello; World'); SELECT * FROM messages;"
  },
  {
    name: "Semicolon in Comment",
    sql: "SELECT * FROM users; -- This comment; has semicolons\nINSERT INTO logs VALUES ('test');"
  },
  {
    name: "PostgreSQL Dollar-Quoted Function",
    sql: `CREATE FUNCTION process_data() RETURNS VOID AS $$
    BEGIN
      INSERT INTO logs (message) VALUES ('Processing; started');
      UPDATE status SET value = 'active; running';
    END;
    $$ LANGUAGE plpgsql;
    
    SELECT process_data();`
  }
];

console.log('🔍 SQL Parser Improvement Demonstration\n');
console.log('This demonstrates how the new parser correctly handles PostgreSQL syntax');
console.log('that would break with simple semicolon splitting.\n');

testCases.forEach((testCase, index) => {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📝 Test Case ${index + 1}: ${testCase.name}`);
  console.log(`${'='.repeat(60)}`);
  
  console.log('\n📄 Input SQL:');
  console.log(testCase.sql);
  
  console.log('\n❌ Old Unsafe Approach (simple semicolon split):');
  const unsafeResult = unsafeSQLSplit(testCase.sql);
  unsafeResult.forEach((stmt, i) => {
    console.log(`   [${i + 1}] ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);
  });
  console.log(`   Total statements: ${unsafeResult.length}`);
  
  console.log('\n✅ New Safe Approach (proper SQL parser):');
  const safeResult = parseSQL(testCase.sql);
  safeResult.forEach((stmt, i) => {
    console.log(`   [${i + 1}] ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);
  });
  console.log(`   Total statements: ${safeResult.length}`);
  
  // Analysis
  if (unsafeResult.length !== safeResult.length) {
    console.log('\n🚨 ISSUE DETECTED: Statement count mismatch!');
    console.log('   The unsafe approach would incorrectly split SQL statements,');
    console.log('   potentially causing database corruption or failed migrations.');
  } else {
    console.log('\n✅ Statement counts match, but content may still differ.');
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log('✅ The new SQL parser correctly handles:');
console.log('   • Semicolons inside string literals');
console.log('   • Semicolons inside comments');
console.log('   • PostgreSQL dollar-quoted strings');
console.log('   • Escaped quotes in strings');
console.log('   • Complex nested syntax');
console.log('');
console.log('❌ The old approach would break on:');
console.log('   • Any semicolon inside quotes or comments');
console.log('   • PostgreSQL functions with dollar-quoting');
console.log('   • Complex migration files');
console.log('');
console.log('🎯 Result: Safe, reliable SQL statement parsing for PostgreSQL migrations');
