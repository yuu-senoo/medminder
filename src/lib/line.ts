import { messagingApi, validateSignature } from "@line/bot-sdk";

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || "",
  channelSecret: process.env.LINE_CHANNEL_SECRET || "",
};

let clientInstance: messagingApi.MessagingApiClient | null = null;

export function getLineClient(): messagingApi.MessagingApiClient {
  if (!clientInstance) {
    clientInstance = new messagingApi.MessagingApiClient({
      channelAccessToken: config.channelAccessToken,
    });
  }
  return clientInstance;
}

export function verifySignature(body: string, signature: string): boolean {
  return validateSignature(body, config.channelSecret, signature);
}

export async function pushMessage(
  userId: string,
  text: string
): Promise<void> {
  const client = getLineClient();
  await client.pushMessage({
    to: userId,
    messages: [{ type: "text", text }],
  });
}

export async function replyMessage(
  replyToken: string,
  text: string
): Promise<void> {
  const client = getLineClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}
