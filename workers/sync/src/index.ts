import { routePartykitRequest } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";

interface Env {
  DocumentSync: DurableObjectNamespace;
  SUPABASE_URL: string;
  SUPABASE_PUBLISHABLE_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

function base64ToUint8Array(base64: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export class DocumentSync extends YServer {
  static options = { hibernate: true };

  static callbackOptions = {
    debounceWait: 2000,
    debounceMaxWait: 10000,
  };

  // Room-level persistence runs as a trusted backend operation, not on
  // behalf of any single connected user — per-user access was already
  // checked in onBeforeConnect before the connection reached this room.
  async onLoad() {
    const env = this.env as unknown as Env;
    const res = await fetch(
      `${env.SUPABASE_URL}/rest/v1/documents?id=eq.${this.name}&select=yjs_state`,
      {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
      },
    );
    const rows = (await res.json()) as { yjs_state: string | null }[];
    const state = rows[0]?.yjs_state;
    if (state) {
      Y.applyUpdate(this.document, base64ToUint8Array(state));
    }
  }

  async onSave() {
    const env = this.env as unknown as Env;
    const state = uint8ArrayToBase64(Y.encodeStateAsUpdate(this.document));

    await fetch(`${env.SUPABASE_URL}/rest/v1/documents?id=eq.${this.name}`, {
      method: "PATCH",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ yjs_state: state }),
    });
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routePartykitRequest(request, env, {
        // Reject the connection before the Durable Object even spins up if
        // the caller can't prove (via their own Supabase session) that
        // they're a member of the workspace this document belongs to.
        onBeforeConnect: async (req) => {
          const url = new URL(req.url);
          const token = url.searchParams.get("token");
          const documentId = url.pathname.split("/").pop();

          if (!token || !documentId) {
            return new Response("Unauthorized", { status: 401 });
          }

          const res = await fetch(
            `${env.SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}&select=id`,
            {
              headers: {
                apikey: env.SUPABASE_PUBLISHABLE_KEY,
                Authorization: `Bearer ${token}`,
              },
            },
          );
          const rows = (await res.json()) as { id: string }[];
          if (!res.ok || rows.length === 0) {
            return new Response("Forbidden", { status: 403 });
          }
        },
      })) ?? new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
