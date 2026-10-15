import test from 'node:test';
import assert from 'node:assert/strict';
import {questions, score} from '../quiz/en/questions.mjs';
import {questions as japanese} from '../quiz/questions.mjs';

test('SPEC-QUIZ-EN-001 ten English journal questions match Japanese answer positions', () => {
  assert.equal(questions.length, 10);
  assert.equal(new Set(questions.map(q => q.q)).size, 10);
  questions.forEach((q, i) => {
    assert.equal(q.options.length, 3);
    assert.equal(q.answer, japanese[i].answer);
    assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 3);
    for (const text of [q.q, q.left, q.right, q.why, ...q.options]) {
      assert.ok(text.trim().length > 0);
      assert.doesNotMatch(text, /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u);
    }
    assert.equal((q.left + q.right).match(/\(\?\)/g)?.length, 1);
  });
  // Verify the accounting answers independently of the answer-index parity.
  assert.deepEqual(questions.map(q => q.options[q.answer]), [
    '100', '60', '90', '60', 'Inventory (pepper)', 'Capital', 'Sales',
    'Cost of goods sold', '30', '310'
  ]);
});

test('SPEC-QUIZ-EN-001 scores all correct, mixed and all wrong as 100, 50 and 0', () => {
  assert.equal(score(questions.map(q => q.answer)), 100);
  assert.equal(score(questions.map((q, i) => i < 5 ? q.answer : (q.answer + 1) % 3)), 50);
  assert.equal(score(questions.map(q => (q.answer + 1) % 3)), 0);
  for (const invalid of [[], null, undefined, 'answers', Array(9), Array(11)]) {
    assert.throws(() => score(invalid), /All answers required/);
  }
});
