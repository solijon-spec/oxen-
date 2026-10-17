import UserSearchPanel from "@/components/UserSearchPanel";

/**
 * Standalone user search page at /people.
 * Wraps UserSearchPanel in the Layout shell (bottom nav, sidebar, etc.)
 */
export default function UserSearch() {
  return (
    <div className="relative mx-auto max-w-2xl px-4 pt-2 pb-32">
      <div className="pt-2 pb-4">
        <h1 className="font-display text-xl font-extrabold">Find People</h1>
        <p className="text-xs text-muted-foreground">Search for travelers on OXEN</p>
      </div>
      <UserSearchPanel embedded />
    </div>
  );
}
