import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"


export function SiteHeader({chatTitle, fileStatus, fileName}: {chatTitle?: string, fileStatus?: string, fileName?: string}) {
  // Function to truncate filename if it's too long
  const getTruncatedFileName = (name?: string) => {
    if (!name) return "";
    return name.length > 20 ? `${name.substring(0, 17)}...` : name;
  };

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">{chatTitle || "New chat"}</h1>
        </div>
        {fileName && (
          <Badge variant="success" className="ml-auto bg-green-100 text-green-900 hover:bg-green-200">
            File: {getTruncatedFileName(fileName)}
          </Badge>
        )}
      </div>
    </header>
  )
}