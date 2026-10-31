import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { MaltaView } from '../../../views/MaltaView';

export const metadata = pageMetadata('it', 'malta');

export default function Page() {
  return (
    <SiteShell locale="it" page="malta">
      <MaltaView locale="it" />
    </SiteShell>
  );
}
