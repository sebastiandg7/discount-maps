import { render } from '@testing-library/react';
import { CONTACT_LINKS } from '@org/domain';
import { ContactLinks } from './contact-links';

describe('ContactLinks', () => {
  it('renders one anchor per channel with the right target', () => {
    const { container } = render(<ContactLinks />);
    const anchors = Array.from(container.querySelectorAll('a'));
    expect(anchors.length).toBe(CONTACT_LINKS.length);
    const mail = anchors.find((a) =>
      a.getAttribute('href')?.startsWith('mailto:'),
    );
    expect(mail?.getAttribute('target')).toBeNull();
    const ig = anchors.find((a) =>
      a.getAttribute('href')?.includes('instagram'),
    );
    expect(ig?.getAttribute('target')).toBe('_blank');
    expect(ig?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});
