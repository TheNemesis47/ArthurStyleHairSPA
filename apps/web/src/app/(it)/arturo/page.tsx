import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { ArturoView } from '../../../views/ArturoView';

export const metadata = pageMetadata('it', 'arturo');

export default function Page() {
  return (
    <SiteShell locale="it" page="arturo">
      <ArturoView locale="it" />
    </SiteShell>
  );
}
