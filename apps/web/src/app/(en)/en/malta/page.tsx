import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { MaltaView } from '../../../../views/MaltaView';

export const metadata = pageMetadata('en', 'malta');

export default function Page() {
  return (
    <SiteShell locale="en" page="malta">
      <MaltaView locale="en" />
    </SiteShell>
  );
}
