/**
 * SQL Injection Prevention Tests
 * 
 * Tests that validate SQL identifier safety utilities prevent SQL injection
 */

import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  isValidIdentifier,
  isValidQualifiedTableName,
  areValidColumnNames,
  isAllowedSchema,
  quoteIdentifier,
  quoteQualifiedTable,
  safeTableName,
  quoteColumns
} from '../src/db/sql-utils.js';

describe('SQL Injection Prevention', () => {
  describe('isValidIdentifier', () => {
    test('accepts valid identifiers', () => {
      assert.strictEqual(isValidIdentifier('users'), true);
      assert.strictEqual(isValidIdentifier('user_roles'), true);
      assert.strictEqual(isValidIdentifier('_private'), true);
      assert.strictEqual(isValidIdentifier('table123'), true);
      assert.strictEqual(isValidIdentifier('CamelCase'), true);
    });

    test('rejects identifiers with SQL injection attempts', () => {
      assert.strictEqual(isValidIdentifier('users; DROP TABLE users--'), false);
      assert.strictEqual(isValidIdentifier('users\' OR \'1\'=\'1'), false);
      assert.strictEqual(isValidIdentifier('users/*comment*/'), false);
      assert.strictEqual(isValidIdentifier('users;'), false);
      assert.strictEqual(isValidIdentifier('users--'), false);
    });

    test('rejects invalid identifiers', () => {
      assert.strictEqual(isValidIdentifier(''), false);
      assert.strictEqual(isValidIdentifier('123abc'), false); // Can't start with digit
      assert.strictEqual(isValidIdentifier('user-name'), false); // No hyphens
      assert.strictEqual(isValidIdentifier('user name'), false); // No spaces
      assert.strictEqual(isValidIdentifier('user.table'), false); // No dots (use qualified check)
    });

    test('rejects identifiers that are too long', () => {
      const longName = 'a'.repeat(64);
      assert.strictEqual(isValidIdentifier(longName), false);
      assert.strictEqual(isValidIdentifier('a'.repeat(63)), true); // Max length
    });
  });

  describe('isValidQualifiedTableName', () => {
    test('accepts valid qualified table names', () => {
      assert.strictEqual(isValidQualifiedTableName('workspace.us_zips'), true);
      assert.strictEqual(isValidQualifiedTableName('reference.delivery_matrix'), true);
      assert.strictEqual(isValidQualifiedTableName('config.users'), true);
    });

    test('rejects SQL injection in qualified names', () => {
      assert.strictEqual(isValidQualifiedTableName('workspace.users; DROP TABLE--'), false);
      assert.strictEqual(isValidQualifiedTableName('workspace\'; DROP TABLE users--'), false);
      assert.strictEqual(isValidQualifiedTableName('workspace.users/*evil*/'), false);
    });

    test('rejects invalid qualified names', () => {
      assert.strictEqual(isValidQualifiedTableName('users'), false); // Not qualified
      assert.strictEqual(isValidQualifiedTableName('schema.table.column'), false); // Too many parts
      assert.strictEqual(isValidQualifiedTableName('.table'), false); // Empty schema
      assert.strictEqual(isValidQualifiedTableName('schema.'), false); // Empty table
    });
  });

  describe('areValidColumnNames', () => {
    test('accepts valid column names', () => {
      assert.strictEqual(areValidColumnNames(['id', 'name', 'email']), true);
      assert.strictEqual(areValidColumnNames(['user_id', 'created_at']), true);
    });

    test('rejects SQL injection in column names', () => {
      assert.strictEqual(areValidColumnNames(['id', 'name; DROP TABLE--']), false);
      assert.strictEqual(areValidColumnNames(['id/*evil*/', 'name']), false);
    });

    test('rejects invalid column arrays', () => {
      assert.strictEqual(areValidColumnNames([]), false); // Empty array
      assert.strictEqual(areValidColumnNames(['id', '']), false); // Empty column
      assert.strictEqual(areValidColumnNames(['id', '123abc']), false); // Invalid identifier
    });
  });

  describe('isAllowedSchema', () => {
    test('accepts allowed schemas', () => {
      assert.strictEqual(isAllowedSchema('workspace'), true);
      assert.strictEqual(isAllowedSchema('reference'), true);
    });

    test('rejects disallowed schemas', () => {
      assert.strictEqual(isAllowedSchema('public'), false);
      assert.strictEqual(isAllowedSchema('config'), false);
      assert.strictEqual(isAllowedSchema('pg_catalog'), false);
      assert.strictEqual(isAllowedSchema('information_schema'), false);
    });
  });

  describe('quoteIdentifier', () => {
    test('quotes valid identifiers', () => {
      assert.strictEqual(quoteIdentifier('users'), '"users"');
      assert.strictEqual(quoteIdentifier('user_roles'), '"user_roles"');
    });

    test('escapes double quotes', () => {
      // Identifiers with double quotes (though rare, they're valid in PG)
      // But our validator rejects them, so this should throw
      assert.throws(() => quoteIdentifier('user"name'), /Invalid identifier/);
    });

    test('throws on SQL injection attempts', () => {
      assert.throws(() => quoteIdentifier('users; DROP TABLE--'), /Invalid identifier/);
      assert.throws(() => quoteIdentifier('users/*evil*/'), /Invalid identifier/);
    });
  });

  describe('quoteQualifiedTable', () => {
    test('quotes valid qualified table names', () => {
      assert.strictEqual(quoteQualifiedTable('workspace.us_zips'), '"workspace"."us_zips"');
      assert.strictEqual(quoteQualifiedTable('reference.delivery_matrix'), '"reference"."delivery_matrix"');
    });

    test('throws on disallowed schemas', () => {
      assert.throws(() => quoteQualifiedTable('public.users'), /not allowed/);
      assert.throws(() => quoteQualifiedTable('config.users'), /not allowed/);
    });

    test('throws on SQL injection attempts', () => {
      assert.throws(() => quoteQualifiedTable('workspace.users; DROP--'), /Invalid qualified table name/);
    });
  });

  describe('safeTableName', () => {
    test('handles already qualified names', () => {
      assert.strictEqual(safeTableName('workspace.us_zips'), '"workspace"."us_zips"');
      assert.strictEqual(safeTableName('reference.delivery_matrix'), '"reference"."delivery_matrix"');
    });

    test('adds default schema to unqualified names', () => {
      assert.strictEqual(safeTableName('us_zips'), '"workspace"."us_zips"');
      assert.strictEqual(safeTableName('delivery_matrix', 'reference'), '"reference"."delivery_matrix"');
    });

    test('throws on disallowed schemas', () => {
      assert.throws(() => safeTableName('config.users'), /not allowed/);
      assert.throws(() => safeTableName('users', 'public'), /not allowed/);
    });

    test('prevents SQL injection', () => {
      assert.throws(() => safeTableName('users; DROP TABLE--'), /Invalid/);
      assert.throws(() => safeTableName('workspace.users/*evil*/'), /Invalid/);
    });
  });

  describe('quoteColumns', () => {
    test('quotes valid column arrays', () => {
      const result = quoteColumns(['id', 'name', 'email']);
      assert.deepStrictEqual(result, ['"id"', '"name"', '"email"']);
    });

    test('throws on SQL injection in columns', () => {
      assert.throws(() => quoteColumns(['id', 'name; DROP--']), /Invalid column names/);
      assert.throws(() => quoteColumns(['id/*evil*/']), /Invalid column names/);
    });

    test('throws on invalid column arrays', () => {
      assert.throws(() => quoteColumns([]), /Invalid column names/);
      assert.throws(() => quoteColumns(['id', '']), /Invalid column names/);
    });
  });

  describe('Real-world attack prevention', () => {
    test('prevents Bobby Tables attack', () => {
      // Classic XKCD attack: "Robert'); DROP TABLE Students;--"
      const maliciousTable = "Students'); DROP TABLE Students;--";
      assert.throws(() => safeTableName(maliciousTable), /Invalid/);
    });

    test('prevents comment-based attacks', () => {
      const attacks = [
        'users/**/OR/**/1=1',
        'users--comment',
        'users/*comment*/table',
      ];
      
      attacks.forEach(attack => {
        assert.throws(() => safeTableName(attack), /Invalid/, `Should reject: ${attack}`);
      });
    });

    test('prevents union-based attacks', () => {
      const attack = "users UNION SELECT * FROM passwords";
      assert.throws(() => safeTableName(attack), /Invalid/);
    });

    test('prevents stacked queries', () => {
      const attack = "users; DELETE FROM users WHERE 1=1";
      assert.throws(() => safeTableName(attack), /Invalid/);
    });
  });
});
