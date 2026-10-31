import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { ServicesView } from '../../../../views/ServicesView';

export const metadata = pageMetadata('en', 'services');

export default function Page() {
  return (
    <SiteShell locale="en" page="services">
      <ServicesView locale="en" />
    </SiteShell>
  );
}
