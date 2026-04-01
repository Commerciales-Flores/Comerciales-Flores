"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import {
  Group,
  Panel,
  Separator,
} from "react-resizable-panels";

import { cn } from "./utils";

type GroupProps = React.ComponentProps<typeof Group>;
type PanelProps = React.ComponentProps<typeof Panel>;
type SeparatorProps = React.ComponentProps<typeof Separator>;

type ResizablePanelGroupProps = Omit<GroupProps, "orientation"> & {
  orientation?: "horizontal" | "vertical";
};

type ResizableHandleProps = SeparatorProps & {
  withHandle?: boolean;
};

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Group
      data-slot="resizable-panel-group"
      orientation={orientation}
      className={cn(
        "flex h-full w-full data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    />
  );
}

function ResizablePanel(props: PanelProps) {
  return <Panel data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle = false,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex w-px items-center justify-center after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-1 data-[orientation=vertical]:h-px data-[orientation=vertical]:w-full data-[orientation=vertical]:after:left-0 data-[orientation=vertical]:after:h-1 data-[orientation=vertical]:after:w-full data-[orientation=vertical]:after:-translate-y-1/2 data-[orientation=vertical]:after:translate-x-0 [&[data-orientation=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      ) : null}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };