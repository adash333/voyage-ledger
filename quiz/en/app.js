import {questions, score} from './questions.mjs';

const $ = id => document.getElementById(id);
let index = 0;
let selected = null;
let checked = false;
let answers = Array(questions.length).fill(null);

function render() {
  const q = questions[index];
  $('questionPanel').hidden = false;
  $('result').hidden = true;
  $('progress').textContent = `Question ${index + 1} of ${questions.length}`;
  $('progressBar').style.width = `${(index + 1) / questions.length * 100}%`;
  $('question').textContent = q.q;
  $('journalLeft').textContent = q.left;
  $('journalRight').textContent = q.right;
  $('answers').replaceChildren();

  q.options.forEach((label, i) => {
    const button = document.createElement('button');
    button.textContent = `${['A', 'B', 'C'][i]} · ${label}`;
    button.type = 'button';
    button.setAttribute('aria-pressed', String(selected === i));
    if (selected === i) button.classList.add('selected');
    if (checked) {
      button.disabled = true;
      if (i === q.answer) button.classList.add('correct');
      else if (i === selected) button.classList.add('wrong');
    } else {
      button.onclick = () => {
        selected = i;
        render();
        $('answers').children[i].focus();
      };
    }
    $('answers').append(button);
  });

  $('feedback').hidden = !checked;
  $('feedback').textContent = checked
    ? `${selected === q.answer ? '🌟 Correct!' : `💡 Not quite. The correct answer is ${q.options[q.answer]}.`} ${q.why}`
    : '';
  $('status').textContent = checked
    ? (selected === q.answer ? '10 points earned!' : 'Keep learning!')
    : '10 questions × 10 points';
  $('next').disabled = selected === null;
  $('next').textContent = checked
    ? (index === questions.length - 1 ? 'See results →' : 'Next question →')
    : 'Check answer →';
}

function result() {
  const total = score(answers);
  $('questionPanel').hidden = true;
  $('result').hidden = false;
  $('score').textContent = `${total} / 100 points`;
  $('message').textContent = total === 100
    ? '🏆 A perfect score! You are a pepper-trading expert!'
    : total >= 80 ? '🌟 Great work! You are close to a perfect score.'
    : total >= 50 ? '👏 Good effort! Try again to build your skills.'
    : '🌱 Every explanation helps you learn. Give it another try!';
  $('review').textContent = `${total / 10} of ${questions.length} correct. Try again to practice the entries and improve your score.`;
  $('result').scrollIntoView({block: 'start', behavior: 'instant'});
  $('resultTitle').focus();
}

$('next').onclick = () => {
  if (selected === null) return;
  if (!checked) {
    answers[index] = selected;
    checked = true;
    render();
  } else if (index === questions.length - 1) {
    result();
  } else {
    index++;
    selected = null;
    checked = false;
    render();
    $('questionPanel').scrollIntoView({block: 'start', behavior: 'instant'});
    $('question').focus();
  }
};

$('retry').onclick = () => {
  index = 0;
  selected = null;
  checked = false;
  answers = Array(questions.length).fill(null);
  render();
  $('questionPanel').scrollIntoView({block: 'start', behavior: 'instant'});
  $('question').focus();
};

render();
