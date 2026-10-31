import type { ReactNode } from 'react';

export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="section" aria-labelledby="page-title">
      <div className="wrap">
        <h1 id="page-title">{title}</h1>
        {lead !== undefined ? <p className="lead">{lead}</p> : null}
        {children}
      </div>
    </section>
  );
}
