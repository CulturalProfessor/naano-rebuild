import { AppHeader } from "@/components/app-header";

/*
  The header is here rather than in each page so a navigation inside /brand
  swaps only the page body. Synchronous on purpose: anything awaited in a
  layout blocks the route's loading fallback from appearing at all.
*/
export default function BrandLayout({ children }: LayoutProps<"/brand">) {
  return (
    <>
      <AppHeader role="brand" />
      {children}
    </>
  );
}
