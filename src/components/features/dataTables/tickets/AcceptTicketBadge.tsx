"use client";

import { useUserSession } from "@ssms/components/stores/useUserSession";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@ssms/components/ui/alert-dialog";
import { Badge } from "@ssms/components/ui/badge";
import { Button } from "@ssms/components/ui/button";
import { $tickets } from "@ssms/lib/rpcClient";
import { session, user } from "@ssms/server/db/schemas/auth";
import { AcceptTicketSchema } from "@ssms/server/validations/ticketsSchemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { FunctionComponent } from "react";
import { toast } from "sonner";
import { z } from "zod";

type AcceptTicketBadgeProps = {
  ticketId: string;
  mode: "badge" | "button";
};

export type UserInSession = {
  session: typeof session.$inferInsert;
  user: typeof user.$inferSelect;
};

export const AcceptTicketBadge: FunctionComponent<AcceptTicketBadgeProps> = ({ ticketId, mode }) => {
  const queryClient = useQueryClient();

  const userSession = useUserSession((state) => state.userSession);

  const { mutate } = useMutation({
    mutationKey: ["accept-ticket"],
    mutationFn: async (data: z.infer<typeof AcceptTicketSchema>) => {
      const res = await $tickets[":id"].accept.$patch({
        json: data,
        param: {
          id: ticketId,
        },
      });

      const updatedTicket = await res.json();

      if (!res.ok) {
        throw updatedTicket;
      }

      return updatedTicket;
    },
    onSuccess: () => {
      toast.success("Successfully accepted the ticket!");
      queryClient.invalidateQueries({ queryKey: ["get-all-tickets", "get-ticket-details"] });
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {mode === "badge" ? (
          <Badge role="button" variant="secondary" className="text-xs space-x-1">
            <Check className="h-3 w-3 text-green-500" />
            <span className="font-bold">Accept</span>
          </Badge>
        ) : (
          <Button variant="secondary">
            <Check className="h-3 w-3 text-green-500" />
            <span className="font-bold">Accept</span>
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            Accepting this ticket serves as an acknowledgment of responsibility and automatically initiates
            the task&apos;s start time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              const assignedId = userSession?.user.id;
              mutate({ assignedId, status: "ongoing" });
            }}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
