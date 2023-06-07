import { channels } from "@/utils/ably/client";
import { assertConfiguration } from "@ably-labs/react-hooks";
import { useSession } from "next-auth/react";
import { useEventHandlers } from "../base";
import Router from "next/router";

export function PrivateEventManager() {
    const ably = assertConfiguration();
    const { data, status } = useSession();
    const handlers = useEventHandlers();

    const onEvent = channels.private.useCallback(
        ({ data: message, name, connectionId }) => {
            const isSelf = ably.connection.id === connectionId;

            if (name === "group_created" && !isSelf) {
                return handlers.createGroup(message);
            }

            if (name === "group_removed" && !isSelf) {
                return handlers.deleteGroup(message.id);
            }

            if (name === "open_dm") {
                return handlers.utils.dm.channels.setData(undefined, (prev) => {
                    if (prev == null || prev.some((c) => c.id === message.id))
                        return prev;

                    return [message, ...prev];
                });
            }

            if (name === "close_dm") {
                handlers.utils.dm.channels.setData(undefined, (prev) => {
                    return prev?.filter((c) => c.id !== message.channel_id);
                });

                if (Router.query.channel === message.channel_id) {
                    Router.push("/home");
                }

                return;
            }
        },
        [ably.connection.id, data, handlers]
    );

    channels.private.useChannel(
        [data?.user?.id ?? ""],
        {
            enabled: status === "authenticated",
        },
        onEvent
    );

    return <></>;
}
