import { SiteShell } from '../../../components/SiteShell';
import { pageMetadata } from '../../../lib/metadata';
import { ServicesView } from '../../../views/ServicesView';

export const metadata = pageMetadata('it', 'services');

export default function Page() {
  return (
    <SiteShell locale="it" page="services">
      <ServicesView locale="it" />
    </SiteShell>
  );
}
