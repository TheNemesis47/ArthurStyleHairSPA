import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { LegalView } from '../../../views/LegalView';

export const metadata = pageMetadata('it', 'legal');

export default function Page() {
  return (
    <SiteShell locale="it" page="legal">
      <LegalView locale="it" page="legal" />
    </SiteShell>
  );
}
