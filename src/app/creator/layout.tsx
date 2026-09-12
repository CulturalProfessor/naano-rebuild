import { AppHeader } from "@/components/app-header";

export default function CreatorLayout({ children }: LayoutProps<"/creator">) {
  return (
    <>
      <AppHeader role="creator" />
      {children}
    </>
  );
}
