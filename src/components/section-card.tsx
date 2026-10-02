import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface SectionCardProps {
  readonly title: ReactNode;
  readonly description?: ReactNode;
  readonly action?: ReactNode;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
  readonly contentClassName?: string;
  readonly footerClassName?: string;
  readonly size?: "default" | "sm";
}

export function SectionCard(props: SectionCardProps): ReactNode {
  return (
    <Card className={cn("min-w-0 [--card-spacing:--spacing(6)]", props.className)} size={props.size ?? "default"}>
      <CardHeader>
        <CardTitle>{typeof props.title === "string" ? <h2>{props.title}</h2> : props.title}</CardTitle>
        {props.description === undefined ? null : <CardDescription>{props.description}</CardDescription>}
        {props.action === undefined ? null : <CardAction>{props.action}</CardAction>}
      </CardHeader>
      <CardContent className={props.contentClassName}>{props.children}</CardContent>
      {props.footer === undefined ? null : <CardFooter className={props.footerClassName}>{props.footer}</CardFooter>}
    </Card>
  );
}
