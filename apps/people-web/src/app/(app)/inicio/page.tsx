import { redirect } from 'next/navigation';

/** Legacy entry point (auth callbacks and the business app still send users here). */
export default function HomePage() {
  redirect('/mapas');
}
