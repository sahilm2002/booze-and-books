import { readFileSync } from 'fs';
import { join } from 'path';

// Import the parsing functions from sync-database.js
// Since we can't directly import from sync-database.js due to its execution,
// we'll copy the functions here for testing

import { parse } from 'pgsql-parser';

/**
 * Safely parse SQL statements using pgsql-parser to handle PostgreSQL syntax
 * including dollar-quoted strings, comments, and string literals
 * @param {string} sql - The SQL content to parse
 * @returns {string[]} - Array of individual SQL statements
 */
function parseSQL(sql) {
  if (!sql || typeof sql !== 'string') {
    throw new Error('Invalid SQL input: must be a non-empty string');
  }

  // Sanitize input - remove null bytes and other potentially dangerous characters
  const sanitizedSQL = sql.replace(/\0/g, '');
  
  try {
    // Use pgsql-parser to properly parse the SQL
    const parsed = parse(sanitizedSQL);
    
    // Extract individual statements from the parse tree
    const statements = [];
    
    if (parsed && Array.isArray(parsed)) {
      for (const stmt of parsed) {
        if (stmt && stmt.RawStmt && stmt.RawStmt.stmt) {
          // Get the original statement text by finding its position in the source
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
    
    // If parser didn't extract statements properly, fall back to custom tokenizer
    if (statements.length === 0) {
      return customSQLTokenizer(sanitizedSQL);
    }
    
    return statements;
    
  } catch (parseError) {
    console.warn('⚠️  pgsql-parser failed, falling back to custom tokenizer:', parseError.message);
    return customSQLTokenizer(sanitizedSQL);
  }
}

/**
 * Custom SQL tokenizer that handles PostgreSQL syntax including:
 * - Single and double quoted strings with escapes
 * - Dollar-quoted strings ($$tag$$...$$tag$$)
 * - Single-line (--) and multi-line comments
 * @param {string} sql - The SQL content to tokenize
 * @returns {string[]} - Array of individual SQL statements
 */
function customSQLTokenizer(sql) {
  const statements = [];
  let current = '';
  let i = 0;
  
  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];
    
    // Handle single-line comments (-- comment)
    if (char === '-' && nextChar === '-') {
      // Skip to end of line
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
      current += '\n'; // Preserve line break
      i++;
      continue;
    }
    
    // Handle multi-line comments (/* comment */)
    if (char === '/' && nextChar === '*') {
      i += 2;
      while (i < sql.length - 1) {
        if (sql[i] === '*' && sql[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      current += ' '; // Replace comment with space
      continue;
    }
    
    // Handle single-quoted strings
    if (char === "'") {
      current += char;
      i++;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === "'") {
          // Check for escaped quote
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
    
    // Handle double-quoted identifiers
    if (char === '"') {
      current += char;
      i++;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === '"') {
          // Check for escaped quote
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
    
    // Handle dollar-quoted strings ($$tag$$...$$tag$$)
    if (char === '$') {
      const dollarStart = i;
      let tag = '$';
      i++;
      
      // Extract the tag
      while (i < sql.length && sql[i] !== '$') {
        tag += sql[i];
        i++;
      }
      
      if (i < sql.length && sql[i] === '$') {
        tag += '$';
        i++;
        current += tag;
        
        // Find the closing tag
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
          // Malformed dollar quote, treat as regular character
          i = dollarStart + 1;
          current += '$';
        }
        continue;
      } else {
        // Not a dollar quote, treat as regular character
        i = dollarStart + 1;
        current += '$';
        continue;
      }
    }
    
    // Handle statement separator (semicolon)
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }
    
    // Regular character
    current += char;
    i++;
  }
  
  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }
  
  return statements;
}

// Test cases
function runTests() {
  console.log('🧪 Running SQL Parser Tests...\n');
  
  let passed = 0;
  let failed = 0;
  
  function test(name, sql, expectedCount, expectedContains = []) {
    try {
      const statements = parseSQL(sql);
      
      console.log(`\n📝 Test: ${name}`);
      console.log(`   Input: ${sql.replace(/\n/g, '\\n')}`);
      console.log(`   Expected statements: ${expectedCount}`);
      console.log(`   Actual statements: ${statements.length}`);
      
      if (statements.length !== expectedCount) {
        console.log(`   ❌ FAILED: Expected ${expectedCount} statements, got ${statements.length}`);
        console.log(`   Statements found:`, statements);
        failed++;
        return;
      }
      
      // Check if expected content is present
      for (const expected of expectedContains) {
        const found = statements.some(stmt => stmt.includes(expected));
        if (!found) {
          console.log(`   ❌ FAILED: Expected to find "${expected}" in statements`);
          console.log(`   Statements found:`, statements);
          failed++;
          return;
        }
      }
      
      console.log(`   ✅ PASSED`);
      if (statements.length > 0) {
        statements.forEach((stmt, i) => {
          console.log(`   [${i + 1}] ${stmt.substring(0, 80)}${stmt.length > 80 ? '...' : ''}`);
        });
      }
      passed++;
      
    } catch (error) {
      console.log(`   ❌ FAILED: ${error.message}`);
      failed++;
    }
  }
  
  // Test 1: Basic statements
  test(
    'Basic SQL statements',
    'SELECT * FROM users; INSERT INTO books (title) VALUES (\'Test\');',
    2,
    ['SELECT * FROM users', 'INSERT INTO books']
  );
  
  // Test 2: Semicolon in single-quoted string
  test(
    'Semicolon in single-quoted string',
    'INSERT INTO messages (content) VALUES (\'Hello; World\'); SELECT * FROM messages;',
    2,
    ['Hello; World', 'SELECT * FROM messages']
  );
  
  // Test 3: Semicolon in double-quoted identifier
  test(
    'Semicolon in double-quoted identifier',
    'CREATE TABLE "test;table" (id INT); SELECT * FROM "test;table";',
    2,
    ['test;table', 'SELECT * FROM']
  );
  
  // Test 4: Single-line comments with semicolons
  test(
    'Single-line comments with semicolons',
    'SELECT * FROM users; -- This is a comment; with semicolon\nINSERT INTO logs (msg) VALUES (\'test\');',
    2,
    ['SELECT * FROM users', 'INSERT INTO logs']
  );
  
  // Test 5: Multi-line comments with semicolons
  test(
    'Multi-line comments with semicolons',
    'SELECT * FROM users; /* This is a comment; with semicolon */ INSERT INTO logs (msg) VALUES (\'test\');',
    2,
    ['SELECT * FROM users', 'INSERT INTO logs']
  );
  
  // Test 6: Dollar-quoted strings with semicolons
  test(
    'Dollar-quoted strings with semicolons',
    'CREATE FUNCTION test() RETURNS TEXT AS $$BEGIN RETURN \'Hello; World\'; END;$$ LANGUAGE plpgsql; SELECT test();',
    2,
    ['CREATE FUNCTION', 'Hello; World', 'SELECT test()']
  );
  
  // Test 7: Dollar-quoted with custom tag
  test(
    'Dollar-quoted with custom tag',
    'CREATE FUNCTION complex() RETURNS TEXT AS $func$BEGIN IF true THEN RETURN \'test; value\'; END IF; END;$func$ LANGUAGE plpgsql; SELECT complex();',
    2,
    ['CREATE FUNCTION', 'test; value', 'SELECT complex()']
  );
  
  // Test 8: Escaped quotes in strings
  test(
    'Escaped quotes in strings',
    'INSERT INTO quotes (text) VALUES (\'Don\'\'t break; this\'); SELECT * FROM quotes;',
    2,
    ['Don\'\'t break; this', 'SELECT * FROM quotes']
  );
  
  // Test 9: Mixed complex case
  test(
    'Mixed complex case',
    `-- Comment with semicolon;
    CREATE FUNCTION process_data() RETURNS VOID AS $$
    BEGIN
      INSERT INTO logs (message) VALUES ('Processing; started');
      /* Multi-line comment
         with semicolon; inside */
      UPDATE status SET value = 'active; running';
    END;
    $$ LANGUAGE plpgsql;
    
    SELECT * FROM logs WHERE message LIKE '%started%';`,
    2,
    ['CREATE FUNCTION', 'Processing; started', 'active; running', 'SELECT * FROM logs']
  );
  
  // Test 10: Empty and whitespace handling
  test(
    'Empty and whitespace handling',
    '   ; SELECT 1; ; ; SELECT 2;   ',
    2,
    ['SELECT 1', 'SELECT 2']
  );
  
  // Test 11: Input validation
  try {
    parseSQL('');
    console.log('\n📝 Test: Empty string validation');
    console.log('   ❌ FAILED: Should throw error for empty string');
    failed++;
  } catch (error) {
    console.log('\n📝 Test: Empty string validation');
    console.log('   ✅ PASSED: Correctly threw error for empty string');
    passed++;
  }
  
  try {
    parseSQL(null);
    console.log('\n📝 Test: Null input validation');
    console.log('   ❌ FAILED: Should throw error for null input');
    failed++;
  } catch (error) {
    console.log('\n📝 Test: Null input validation');
    console.log('   ✅ PASSED: Correctly threw error for null input');
    passed++;
  }
  
  // Test 12: Null byte sanitization
  test(
    'Null byte sanitization',
    'SELECT * FROM users\0; INSERT INTO logs VALUES (\'test\');',
    2,
    ['SELECT * FROM users', 'INSERT INTO logs']
  );
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('❌ Some tests failed!');
    return false;
  }
}

// Run the tests
const success = runTests();
process.exit(success ? 0 : 1);
