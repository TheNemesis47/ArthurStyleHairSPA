import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { LegalView } from '../../../../views/LegalView';

export const metadata = pageMetadata('en', 'legal');

export default function Page() {
  return (
    <SiteShell locale="en" page="legal">
      <LegalView locale="en" page="legal" />
    </SiteShell>
  );
}
