import { describe, test } from 'node:test';
import assert from 'node:assert';
import {
  isValidIcon,
  generateRoleCode,
  validateRoleName,
  validateDescription,
  validatePermissions,
} from '../src/lib/validation.js';

describe('Validation Utilities', () => {
  describe('isValidIcon', () => {
    test('accepts valid icon names', () => {
      assert.strictEqual(isValidIcon('shield'), true);
      assert.strictEqual(isValidIcon('crown'), true);
      assert.strictEqual(isValidIcon('users'), true);
      assert.strictEqual(isValidIcon('warehouse'), true);
    });

    test('rejects invalid icon names', () => {
      assert.strictEqual(isValidIcon('invalid'), false);
      assert.strictEqual(isValidIcon(''), false);
      assert.strictEqual(isValidIcon('Shield'), false); // case-sensitive
      assert.strictEqual(isValidIcon('user'), false); // must be exact match
    });
  });

  describe('generateRoleCode', () => {
    test('generates valid codes from simple names', () => {
      assert.strictEqual(generateRoleCode('Admin'), 'admin');
      assert.strictEqual(generateRoleCode('Warehouse Lead'), 'warehouse_lead');
      assert.strictEqual(generateRoleCode('3PL Manager'), '3pl_manager');
    });

    test('handles special characters', () => {
      assert.strictEqual(generateRoleCode('User-Manager'), 'user_manager');
      assert.strictEqual(generateRoleCode('Role #1'), 'role_1');
      assert.strictEqual(generateRoleCode('Test & QA'), 'test_qa');
    });

    test('trims leading/trailing underscores', () => {
      assert.strictEqual(generateRoleCode('_Admin_'), 'admin');
      assert.strictEqual(generateRoleCode('___Test___'), 'test');
    });

    test('collapses multiple underscores', () => {
      assert.strictEqual(generateRoleCode('A   B'), 'a_b');
      assert.strictEqual(generateRoleCode('Test___Role'), 'test_role');
    });

    test('throws on invalid input', () => {
      assert.throws(() => generateRoleCode(''), /non-empty string/);
      assert.throws(() => generateRoleCode('   '), /at least 2 characters/);
      assert.throws(() => generateRoleCode('!@#$'), /at least 2 characters/);
      assert.throws(() => generateRoleCode('a'), /at least 2 characters/);
    });

    test('throws on too long names', () => {
      const longName = 'a'.repeat(100);
      assert.throws(() => generateRoleCode(longName), /maximum 50 characters/);
    });

    test('throws on non-string input', () => {
      assert.throws(() => generateRoleCode(null as any), /non-empty string/);
      assert.throws(() => generateRoleCode(123 as any), /non-empty string/);
    });
  });

  describe('validateRoleName', () => {
    test('accepts valid names', () => {
      assert.deepStrictEqual(validateRoleName('Admin'), { valid: true });
      assert.deepStrictEqual(validateRoleName('Warehouse Lead'), { valid: true });
      assert.deepStrictEqual(validateRoleName('3PL Manager'), { valid: true });
    });

    test('rejects invalid names', () => {
      const emptyResult = validateRoleName('');
      assert.strictEqual(emptyResult.valid, false);
      assert.ok(emptyResult.error);

      const shortResult = validateRoleName('A');
      assert.strictEqual(shortResult.valid, false);
      assert.ok(shortResult.error);

      const longResult = validateRoleName('a'.repeat(101));
      assert.strictEqual(longResult.valid, false);
      assert.ok(longResult.error);

      const nonStringResult = validateRoleName(123);
      assert.strictEqual(nonStringResult.valid, false);
      assert.ok(nonStringResult.error);
    });

    test('rejects names that generate invalid codes', () => {
      const result = validateRoleName('!@#$%');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('at least 2 characters'));
    });
  });

  describe('validateDescription', () => {
    test('accepts valid descriptions', () => {
      assert.deepStrictEqual(validateDescription('A simple description'), { valid: true });
      assert.deepStrictEqual(validateDescription(''), { valid: true }); // Empty is ok
      assert.deepStrictEqual(validateDescription(null), { valid: true }); // Null is ok
      assert.deepStrictEqual(validateDescription(undefined), { valid: true }); // Undefined is ok
    });

    test('rejects too long descriptions', () => {
      const longDesc = 'a'.repeat(501);
      const result = validateDescription(longDesc);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('at most 500'));
    });

    test('rejects non-string descriptions', () => {
      const result = validateDescription(123);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('must be a string'));
    });
  });

  describe('validatePermissions', () => {
    test('accepts valid permission arrays', () => {
      assert.deepStrictEqual(validatePermissions(['view_users']), { valid: true });
      assert.deepStrictEqual(validatePermissions(['view_users', 'manage_users']), { valid: true });
      assert.deepStrictEqual(validatePermissions(['view_roles']), { valid: true });
    });

    test('rejects non-arrays', () => {
      const result = validatePermissions('not_an_array');
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('must be an array'));
    });

    test('rejects empty arrays', () => {
      const result = validatePermissions([]);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error);
    });

    test('rejects too many permissions', () => {
      const tooMany = Array(101).fill('view_users');
      const result = validatePermissions(tooMany);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('maximum 100'));
    });

    test('rejects non-string items', () => {
      const result = validatePermissions(['view_users', 123, 'manage_users']);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('must be strings'));
    });

    test('rejects duplicates', () => {
      const result = validatePermissions(['view_users', 'view_users']);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('Duplicate'));
    });

    test('rejects invalid permission format', () => {
      const result = validatePermissions(['view-users']); // hyphens not allowed
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('Invalid permission format'));
    });

    test('rejects uppercase permissions', () => {
      const result = validatePermissions(['VIEW_USERS']);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error?.includes('Invalid permission format'));
    });

    test('accepts permission format with underscores', () => {
      assert.deepStrictEqual(validatePermissions(['view_user_profiles']), { valid: true });
      assert.deepStrictEqual(validatePermissions(['manage_settings']), { valid: true });
    });
  });
});
