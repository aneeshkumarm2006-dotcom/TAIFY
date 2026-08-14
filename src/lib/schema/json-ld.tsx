/**
 * One `<script type="application/ld+json">` per page, holding every node in a
 * single `@graph`.
 *
 * `@graph` is the standard JSON-LD container for a document describing several
 * things at once. Google's docs never name it, but its own guidance for pages
 * with more than one kind of thing is to link the items by `@id` — which is
 * exactly what a graph is for — and both the Rich Results Test and
 * validator.schema.org accept it. It replaces the three or four sibling script
 * tags the routes used to emit, none of which could reference each other.
 */
export function JsonLd({ graph }: { graph: object[] }) {
  if (!graph.length) return null;
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", "@graph": graph }),
      }}
    />
  );
}
