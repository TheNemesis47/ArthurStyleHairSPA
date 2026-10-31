import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { LegalView } from '../../../../views/LegalView';

export const metadata = pageMetadata('en', 'cookies');

export default function Page() {
  return (
    <SiteShell locale="en" page="cookies">
      <LegalView locale="en" page="cookies" />
    </SiteShell>
  );
}
