import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the Syllify consent dialog', () => {
  render(<App />);
  expect(screen.getByText(/by using syllify you agree that/i)).toBeInTheDocument();
});
