import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { ContactView } from '../../../views/ContactView';

export const metadata = pageMetadata('it', 'contact');

export default function Page() {
  return (
    <SiteShell locale="it" page="contact">
      <ContactView locale="it" />
    </SiteShell>
  );
}
