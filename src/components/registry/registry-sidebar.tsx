"use client";

import { LayoutGrid, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { ModeToggle } from "@/components/registry/theme-toggle";
import { BrandLogo } from "@/components/skills/brand-logo";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CATEGORIES } from "@/lib/skill-categories";

export function MobileSidebarTrigger() {
  const { setOpenMobile } = useSidebar();

  return (
    <div className="absolute top-4 right-4 z-20 md:hidden">
      <Button
        aria-label="Open menu"
        size="icon"
        onClick={() => setOpenMobile(true)}
      >
        <Menu className="size-5" />
      </Button>
    </div>
  );
}

export function RegistrySidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);
  const categories = CATEGORIES.filter((c) => c.id !== "other");

  return (
    <Sidebar>
      <SidebarHeader className="border-b">
        <div className="flex items-center justify-between px-2 py-2">
          <Link href="/" className="flex min-w-0 items-center" onClick={close}>
            <BrandLogo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={close}
          >
            <X />
          </Button>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/"}>
                  <Link onClick={close} href="/">
                    <LayoutGrid className="size-4" />
                    <span>All skills</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Categories</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {categories.map((c) => {
                const Icon = c.icon;
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton asChild tooltip={c.label}>
                      <Link onClick={close} href={`/#cat-${c.id}`}>
                        <Icon className="size-4 text-brand-cyan-dark dark:text-brand-cyan" />
                        <span>{c.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[0.7rem] text-muted-foreground leading-tight">
            AI expertise,
            <br />
            built together.
          </span>
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
