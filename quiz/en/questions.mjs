// SPEC-QUIZ-EN-001: The same journal-entry challenges as the Japanese edition.
export const questions = [
  {
    q: 'You start a trading company with 100 gold coins. What amount goes on the right?',
    left: 'Cash 100', right: 'Capital (?)',
    options: ['60', '100', '130'], answer: 1,
    why: 'Cash increases by 100 coins on the debit (left). Capital, the money the owner invests, increases by 100 on the credit (right). Both sides are equal.'
  },
  {
    q: 'You buy 10 bags of pepper for 60 gold coins. What amount goes on the right?',
    left: 'Inventory (pepper) 60', right: 'Cash (?)',
    options: ['60', '40', '100'], answer: 0,
    why: 'Inventory increases by 60 coins on the debit side, while cash decreases by 60 on the credit side. The entry records the 60 coins paid, not the 40 coins left.'
  },
  {
    q: 'You sell all the pepper for 90 gold coins. What amount goes on the right?',
    left: 'Cash 90', right: 'Sales (?)',
    options: ['30', '60', '90'], answer: 2,
    why: 'Record the selling price of 90 coins as both a debit to Cash and a credit to Sales. Sales are 90 coins; profit is different because we must also count the cost of the pepper.'
  },
  {
    q: 'The pepper you sold originally cost 60 gold coins. What amount goes on the right?',
    left: 'Cost of goods sold 60', right: 'Inventory (pepper) (?)',
    options: ['90', '60', '30'], answer: 1,
    why: 'Move the sold pepper’s original cost of 60 coins out of Inventory on the credit side and into Cost of goods sold, an expense, on the debit side.'
  },
  {
    q: 'You buy pepper for 60 gold coins. Which account goes on the left?',
    left: '(?) 60', right: 'Cash 60',
    options: ['Inventory (pepper)', 'Sales', 'Capital'], answer: 0,
    why: 'Pepper bought for resale is Inventory, an asset. Debit Inventory when it increases and credit Cash for the amount paid.'
  },
  {
    q: 'You invest 100 of your own gold coins in the company. Which account goes on the right?',
    left: 'Cash 100', right: '(?) 100',
    options: ['Sales', 'Cost of goods sold', 'Capital'], answer: 2,
    why: 'The owner’s investment is Capital, not Sales. Debit Cash and credit Capital by 100 coins. This investment is not profit.'
  },
  {
    q: 'You sell pepper for 90 gold coins. Which account goes on the right?',
    left: 'Cash 90', right: '(?) 90',
    options: ['Inventory (pepper)', 'Sales', 'Capital'], answer: 1,
    why: 'The amount earned from selling pepper is Sales. Debit Cash and credit Sales by 90 coins. A separate entry records the cost of the pepper sold.'
  },
  {
    q: 'The pepper you sold originally cost 60 gold coins. Which account goes on the left?',
    left: '(?) 60', right: 'Inventory (pepper) 60',
    options: ['Cost of goods sold', 'Capital', 'Cash'], answer: 0,
    why: 'The original cost of the sold pepper becomes an expense called Cost of goods sold. Debit this expense and credit Inventory by 60 coins.'
  },
  {
    q: 'Your final balance sheet shows 130 coins in cash and 100 in capital. With no debt or inventory left, what is the profit?',
    left: 'Assets (cash) 130', right: 'Capital 100 + Profit (?)',
    options: ['60', '90', '30'], answer: 2,
    why: '130 − 100 = 30 coins of profit. Assets of 130 equal capital of 100 plus profit of 30. The balance sheet shows where the company’s wealth came from.'
  },
  {
    q: 'The four journal entries have total debits of 100 + 60 + 90 + 60. What are the total credits?',
    left: 'Total debits (left) 310', right: 'Total credits (right) (?)',
    options: ['280', '310', '130'], answer: 1,
    why: 'Every journal entry has equal debits and credits, so both totals are 310 coins. This total counts all entries; it is not the final cash balance of 130.'
  }
];

export function score(answers) {
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    throw Error('All answers required');
  }
  return questions.reduce((total, q, i) => total + (answers[i] === q.answer ? 10 : 0), 0);
}
