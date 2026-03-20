import { AppSidebar } from "@/components/app-sidebar"
import {
    SidebarInset,
    SidebarProvider,
} from "@/components/ui/sidebar"
import FileBrowser from "@/layout/file-browser"

export default function Layout() {
    // Render
    return (
        <SidebarProvider
            style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 72)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
            }
            className="pt-8"
        >
            <AppSidebar variant="inset" />
            <SidebarInset className="flex-1 w-0 h-[calc(100vh-3rem)] max-h-[calc(100vh-3rem)] overflow-hidden">
                <FileBrowser />
            </SidebarInset>
        </SidebarProvider>
    )
}
