# SQL Parser Implementation

## Overview

The `sync-database.js` file has been updated to use a robust SQL statement parser that safely handles PostgreSQL's complex syntax, replacing the previous unsafe semicolon-based splitting approach.

## Problem Solved

The original implementation used simple semicolon splitting:
```javascript
const statements = migrationSQL
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
```

This approach was unsafe because it would incorrectly split SQL on semicolons that appear inside:
- String literals (`'Hello; World'`)
- Double-quoted identifiers (`"table;name"`)
- Single-line comments (`-- comment; with semicolon`)
- Multi-line comments (`/* comment; with semicolon */`)
- PostgreSQL dollar-quoted strings (`$$BEGIN SELECT 'test; value'; END;$$`)

## Solution

### Dependencies Added

- **pgsql-parser**: A proven PostgreSQL parser that understands the full PostgreSQL syntax including dollar-quoting

```bash
npm install pgsql-parser
```

### Implementation

The solution uses a two-tier approach:

1. **Primary Parser**: Uses `pgsql-parser` to properly parse PostgreSQL SQL
2. **Fallback Tokenizer**: Custom stateful tokenizer for cases where the primary parser fails

#### Key Functions

##### `parseSQL(sql)`
- Main entry point for SQL parsing
- Validates and sanitizes input (removes null bytes)
- Attempts to use `pgsql-parser` first
- Falls back to custom tokenizer if needed
- Returns array of individual SQL statements

##### `customSQLTokenizer(sql)`
- Custom tokenizer that handles PostgreSQL syntax
- Tracks state for:
  - Single-quoted strings with escape handling
  - Double-quoted identifiers with escape handling
  - Dollar-quoted strings with custom tags
  - Single-line comments (`--`)
  - Multi-line comments (`/* */`)
- Properly identifies statement boundaries (semicolons)

### Features

#### Input Validation
- Validates input is a non-empty string
- Sanitizes input by removing null bytes
- Throws descriptive errors for invalid input

#### Security
- Input sanitization prevents null byte injection
- Proper escaping and validation of all inputs
- No direct string concatenation for SQL execution

#### PostgreSQL Syntax Support
- **String Literals**: Handles single quotes with proper escaping (`'Don''t'`)
- **Identifiers**: Handles double-quoted identifiers with escaping (`"table""name"`)
- **Dollar Quoting**: Full support for PostgreSQL dollar-quoted strings:
  - Simple: `$$content$$`
  - Tagged: `$tag$content$tag$`
  - Nested: `$outer$text $inner$nested$inner$ text$outer$`
- **Comments**: 
  - Single-line: `-- comment`
  - Multi-line: `/* comment */`

## Testing

Comprehensive test suite in `test-sql-parser.js` covers:

### Edge Cases Tested
1. Basic SQL statements
2. Semicolons in single-quoted strings
3. Semicolons in double-quoted identifiers
4. Single-line comments with semicolons
5. Multi-line comments with semicolons
6. Dollar-quoted strings with semicolons
7. Dollar-quoted strings with custom tags
8. Escaped quotes in strings
9. Complex mixed cases
10. Empty and whitespace handling
11. Input validation (null, empty strings)
12. Null byte sanitization

### Running Tests
```bash
node test-sql-parser.js
```

All tests pass, validating the parser handles PostgreSQL syntax correctly.

## Usage

The parser is automatically used in `sync-database.js`:

```javascript
// Old unsafe approach:
const statements = migrationSQL.split(';')...

// New safe approach:
const statements = parseSQL(migrationSQL);
```

## Benefits

1. **Safety**: No longer breaks on semicolons inside strings, comments, or functions
2. **Correctness**: Properly handles all PostgreSQL syntax constructs
3. **Reliability**: Fallback tokenizer ensures parsing always succeeds
4. **Validation**: Input validation and sanitization prevent injection attacks
5. **Maintainability**: Well-tested with comprehensive test suite

## Migration Notes

- The change is backward compatible
- No changes needed to existing migration files
- Improved parsing accuracy for complex SQL statements
- Better error handling and logging

## Dependencies

- `pgsql-parser`: PostgreSQL SQL parser
- Existing dependencies remain unchanged

This implementation ensures safe and accurate parsing of PostgreSQL migration files, eliminating the risk of incorrect statement splitting that could lead to database corruption or failed migrations.
