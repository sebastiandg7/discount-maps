import { render } from '@testing-library/react';
import { PasswordForm, ProfileForm } from './account-forms';

const noop = async () => ({});

describe('account forms', () => {
  it('ProfileForm pre-fills the values and keeps the email read-only', () => {
    const { container } = render(
      <ProfileForm
        action={noop}
        values={{ fullName: 'Ana', phone: '300', email: 'ana@test.dev' }}
      />,
    );
    const name = container.querySelector<HTMLInputElement>('#fullName');
    const email = container.querySelector<HTMLInputElement>('#email');
    expect(name?.value).toBe('Ana');
    expect(email?.value).toBe('ana@test.dev');
    expect(email?.readOnly).toBe(true);
  });

  it('PasswordForm renders two password inputs', () => {
    const { container } = render(<PasswordForm action={noop} />);
    expect(container.querySelectorAll('input[type="password"]').length).toBe(2);
  });
});
