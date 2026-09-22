import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryChips } from './category-chips';

describe('CategoryChips', () => {
  it('renders "Todas" plus the four categories with the selection pressed', () => {
    render(<CategoryChips value="desserts" onChange={() => undefined} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBe(5);
    expect(
      screen
        .getByRole('button', { name: 'Postres' })
        .getAttribute('aria-pressed'),
    ).toBe('true');
    expect(
      screen
        .getByRole('button', { name: 'Todas' })
        .getAttribute('aria-pressed'),
    ).toBe('false');
  });

  it('emits the category id, and null for "Todas"', () => {
    const onChange = jest.fn();
    render(<CategoryChips value={null} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }));
    expect(onChange).toHaveBeenCalledWith('beverages');
    fireEvent.click(screen.getByRole('button', { name: 'Todas' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
