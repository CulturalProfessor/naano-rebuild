import { SiteHeader } from "@/components/site-header";

/* A creator's card is the other page a stranger and a signed-in brand both
   land on. Same rule as the marketplace. */
export default function PublicCardLayout({ children }: LayoutProps<"/c">) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
