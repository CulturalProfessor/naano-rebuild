import { SiteHeader } from "@/components/site-header";

/*
  In the layout rather than the page so it survives a filter change and the
  grid's own Suspense fallback. It costs two indexed queries before the route
  renders, which the top rail already covers.
*/
export default function MarketplaceLayout({
  children,
}: LayoutProps<"/marketplace">) {
  return (
    <>
      <SiteHeader active="/marketplace" />
      {children}
    </>
  );
}
