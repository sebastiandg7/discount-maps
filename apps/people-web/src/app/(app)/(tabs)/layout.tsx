import { PeopleBottomNav } from './bottom-nav';

/** Tabbed shell: Mapas / Contacto / Cuenta. Pages reserve space for the bar with pb-20. */
export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PeopleBottomNav />
    </>
  );
}
