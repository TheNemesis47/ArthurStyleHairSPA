import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { LegalView } from '../../../views/LegalView';

export const metadata = pageMetadata('it', 'privacy');

export default function Page() {
  return (
    <SiteShell locale="it" page="privacy">
      <LegalView locale="it" page="privacy" />
    </SiteShell>
  );
}
