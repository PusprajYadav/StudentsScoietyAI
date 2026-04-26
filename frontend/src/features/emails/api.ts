import { requestBackend } from "../../lib/backendApi";
import type {
  EmailAdminDashboard,
  EmailConnectionRow,
  EmailMailboxRow,
  EmailMailboxOverview,
  EmailMailboxRequestRow,
  EmailMessageDetail,
  EmailMessageListResponse,
  EmailMessageSummaryRow,
} from "./types";

function unwrapData<T>(payload: { data: T }) {
  return payload.data;
}

export async function loadEmailOverview() {
  return unwrapData<EmailMailboxOverview>(
    await requestBackend("/api/emails/overview", {
      featureName: "Student Email",
    })
  );
}

export async function createEmailRequest(input: {
  preferred_email_address?: string;
  preferred_local_part?: string;
  plan_feature_key: string;
  request_note?: string;
}) {
  return unwrapData<EmailMailboxRequestRow>(
    await requestBackend("/api/emails/request", {
      method: "POST",
      body: input,
      featureName: "Student Email",
    })
  );
}

export async function listEmailMessages(input: {
  folder: "inbox" | "sent" | "trash";
  offset?: number;
  limit?: number;
  mailboxId?: string | null;
}) {
  const params = new URLSearchParams({
    folder: input.folder,
    offset: String(input.offset || 0),
    limit: String(input.limit || 10),
  });

  if (input.mailboxId) {
    params.set("mailbox_id", input.mailboxId);
  }

  return unwrapData<EmailMessageListResponse>(
    await requestBackend(`/api/emails/messages?${params.toString()}`, {
      featureName: "Student Email",
    })
  );
}

export async function loadEmailMessage(messageId: string) {
  return unwrapData<EmailMessageDetail>(
    await requestBackend(`/api/emails/messages/${messageId}`, {
      featureName: "Student Email",
    })
  );
}

export async function deleteEmailMessage(messageId: string) {
  return unwrapData<{ deleted: boolean; message_id: string; deleted_at?: string }>(
    await requestBackend(`/api/emails/messages/${messageId}/delete`, {
      method: "POST",
      body: {},
      featureName: "Student Email",
    })
  );
}

export async function listEmailConnections(mailboxId?: string | null) {
  const params = new URLSearchParams();

  if (mailboxId) {
    params.set("mailbox_id", mailboxId);
  }

  return unwrapData<EmailConnectionRow[]>(
    await requestBackend(`/api/emails/connections${params.toString() ? `?${params.toString()}` : ""}`, {
      featureName: "Student Email",
    })
  );
}

export async function saveEmailConnection(profile: Record<string, unknown>) {
  return unwrapData<EmailConnectionRow>(
    await requestBackend("/api/emails/connections", {
      method: "POST",
      body: {
        action: "save",
        profile,
      },
      featureName: "Student Email",
    })
  );
}

export async function testEmailConnection(input: {
  connectionId?: string | null;
  profile?: Record<string, unknown>;
}) {
  return unwrapData<{
    success: boolean;
    smtp: string;
    imap: string;
    profile: EmailConnectionRow;
  }>(
    await requestBackend("/api/emails/connections", {
      method: "POST",
      body: {
        action: "test",
        connection_id: input.connectionId || undefined,
        profile: input.profile,
      },
      featureName: "Student Email",
    })
  );
}

export async function deleteEmailConnection(connectionId: string) {
  return unwrapData<{ deleted: boolean }>(
    await requestBackend("/api/emails/connections", {
      method: "POST",
      body: {
        action: "delete",
        connection_id: connectionId,
      },
      featureName: "Student Email",
    })
  );
}

export async function revealEmailConnection(connectionId: string) {
  return unwrapData<{
    id: string;
    email_address: string;
    username: string;
    password: string;
  }>(
    await requestBackend("/api/emails/connections", {
      method: "POST",
      body: {
        action: "reveal",
        connection_id: connectionId,
      },
      featureName: "Student Email",
    })
  );
}

export async function sendEmailMessage(input: Record<string, unknown>) {
  return unwrapData<{
    message: EmailMessageSummaryRow;
    successful_recipients: Array<{ email: string; name?: string | null }>;
    failed_recipients: Array<{ email: string; error: string }>;
    tracking_rows: Array<{
      id: string;
      recipient_email: string;
      recipient_name: string | null;
      open_count: number;
      opened_at: string | null;
      last_opened_at: string | null;
    }>;
  }>(
    await requestBackend("/api/emails/send", {
      method: "POST",
      body: input,
      featureName: "Student Email",
    })
  );
}

export async function syncEmailMailbox(input: { mailboxId?: string | null; connectionId?: string | null; limit?: number }) {
  return unwrapData<{
    imported_count: number;
    last_synced_at: string;
    connection_id: string;
  }>(
    await requestBackend("/api/emails/sync", {
      method: "POST",
      body: {
        mailbox_id: input.mailboxId || undefined,
        connection_id: input.connectionId || undefined,
        limit: input.limit || 20,
      },
      featureName: "Student Email",
    })
  );
}

export async function loadEmailAdminDashboard() {
  return unwrapData<EmailAdminDashboard>(
    await requestBackend("/api/emails/admin/dashboard", {
      featureName: "Student Email",
    })
  );
}

export async function reviewEmailRequest(requestId: string, input: { status: "approved" | "rejected" | "cancelled"; admin_note?: string }) {
  return unwrapData<EmailMailboxRequestRow>(
    await requestBackend(`/api/emails/admin/requests/${requestId}/review`, {
      method: "POST",
      body: input,
      featureName: "Student Email",
    })
  );
}

export async function assignEmailRequest(requestId: string, input: Record<string, unknown>) {
  return unwrapData<{
    mailbox: EmailMailboxRow;
    request: EmailMailboxRequestRow;
  }>(
    await requestBackend(`/api/emails/admin/requests/${requestId}/assign`, {
      method: "POST",
      body: input,
      featureName: "Student Email",
    })
  );
}
