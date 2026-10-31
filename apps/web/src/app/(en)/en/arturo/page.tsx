import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { ArturoView } from '../../../../views/ArturoView';

export const metadata = pageMetadata('en', 'arturo');

export default function Page() {
  return (
    <SiteShell locale="en" page="arturo">
      <ArturoView locale="en" />
    </SiteShell>
  );
}
