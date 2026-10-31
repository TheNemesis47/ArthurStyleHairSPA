import { SiteShell } from '../../components/SiteShell';
import { pageMetadata } from '../../lib/metadata';
import { HomeView } from '../../views/HomeView';

export const metadata = pageMetadata('it', 'home');

export default function Page() {
  return (
    <SiteShell locale="it" page="home">
      <HomeView locale="it" />
    </SiteShell>
  );
}
