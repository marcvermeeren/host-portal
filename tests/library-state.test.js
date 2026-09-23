import test from 'node:test';
import assert from 'node:assert/strict';
import { CAPACITY_BYTES, interactionCount, makeRoom, usedBytes } from '../src/library-state.js';

const MB = 1_000_000;
const book = (id, bytes, downloads, comments, order) => ({
  id, bytes, downloads, comments:Array.from({ length:comments }, () => ({})), order
});

test('a download and a comment each protect a book equally', () => {
  const books = [
    book('idle', 300 * MB, 0, 0, 0),
    book('downloaded', 100 * MB, 1, 0, 1),
    book('commented', 50 * MB, 0, 1, 2)
  ];
  const plan = makeRoom(books, 100 * MB);
  assert.deepEqual(plan.removed.map(item => item.id), ['idle']);
  assert.deepEqual(plan.books.map(item => item.id), ['downloaded', 'commented']);
  assert.equal(books.length, 3);
  assert.equal(interactionCount(books[1]), interactionCount(books[2]));
});

test('oldest book breaks an interaction tie and enough books leave to fit', () => {
  const books = [
    book('older', 220 * MB, 0, 0, 0),
    book('newer', 220 * MB, 0, 0, 1),
    book('popular', 50 * MB, 4, 2, 2)
  ];
  const plan = makeRoom(books, 450 * MB);
  assert.deepEqual(plan.removed.map(item => item.id), ['older', 'newer']);
  assert.equal(usedBytes(plan.books) + 450 * MB, CAPACITY_BYTES);
});

test('exact-fit additions do not evict and oversized files are rejected', () => {
  const books = [book('kept', 450 * MB, 0, 0, 0)];
  assert.deepEqual(makeRoom(books, 50 * MB).removed, []);
  const rejected = makeRoom(books, CAPACITY_BYTES + 1);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.books, books);
});
