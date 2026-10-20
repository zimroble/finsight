import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

test('dashboard shows totals computed from the sample transactions', () => {
  render(<App />);
  expect(screen.getByText('Total Spent')).toBeInTheDocument();
  expect(screen.getByText('$864.74')).toBeInTheDocument();
  expect(screen.getByText('$396.89 spent')).toBeInTheDocument();
});

test('adding a transaction updates the list', () => {
  render(<App />);
  fireEvent.click(screen.getByText(/Transactions/));
  fireEvent.click(screen.getByText('+ Add Transaction'));
  fireEvent.change(screen.getByPlaceholderText('e.g. Whole Foods'), { target: { value: 'Bookstore' } });
  fireEvent.change(screen.getByPlaceholderText('0.00'), { target: { value: '25' } });
  fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: '2026-02-28' } });
  fireEvent.click(screen.getByText('Add'));
  expect(screen.getByText('Bookstore')).toBeInTheDocument();
  expect(screen.getByText(/16 transactions/)).toBeInTheDocument();
});
