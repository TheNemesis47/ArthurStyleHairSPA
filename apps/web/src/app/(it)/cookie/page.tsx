import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { LegalView } from '../../../views/LegalView';

export const metadata = pageMetadata('it', 'cookies');

export default function Page() {
  return (
    <SiteShell locale="it" page="cookies">
      <LegalView locale="it" page="cookies" />
    </SiteShell>
  );
}
