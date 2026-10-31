import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { ContactView } from '../../../../views/ContactView';

export const metadata = pageMetadata('en', 'contact');

export default function Page() {
  return (
    <SiteShell locale="en" page="contact">
      <ContactView locale="en" />
    </SiteShell>
  );
}
