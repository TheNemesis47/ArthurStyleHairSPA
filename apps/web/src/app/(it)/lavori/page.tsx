import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { WorkView } from '../../../views/WorkView';

export const metadata = pageMetadata('it', 'work');

export default function Page() {
  return (
    <SiteShell locale="it" page="work">
      <WorkView locale="it" />
    </SiteShell>
  );
}
