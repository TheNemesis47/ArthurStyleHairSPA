import { SiteShell } from '../../../../components/SiteShell';
import { pageMetadata } from '../../../../lib/metadata';
import { WorkView } from '../../../../views/WorkView';

export const metadata = pageMetadata('en', 'work');

export default function Page() {
  return (
    <SiteShell locale="en" page="work">
      <WorkView locale="en" />
    </SiteShell>
  );
}
