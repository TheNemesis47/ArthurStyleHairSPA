import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { LegalView } from '../../../../views/LegalView';

export const metadata = pageMetadata('en', 'privacy');

export default function Page() {
  return (
    <SiteShell locale="en" page="privacy">
      <LegalView locale="en" page="privacy" />
    </SiteShell>
  );
}
