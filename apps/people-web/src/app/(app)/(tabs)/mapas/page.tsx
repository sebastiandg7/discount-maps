import { PageShell, TopBar } from '@org/ui';
import { NearbyExplorer } from './nearby-explorer';

export const dynamic = 'force-dynamic';

export default function MapsPage() {
  return (
    <PageShell className="pb-20">
      <TopBar title="Mapas" />
      <NearbyExplorer
        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || null}
        mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || null}
      />
    </PageShell>
  );
}
