import { api } from '../../lib/api';

export type MessageType = 'TEXT' | 'IMAGE' | 'VOICE' | 'GIF';

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  text: string;
  type: MessageType;
  mediaUrl: string | null;
  createdAt: string;
}

export interface MessagesResponse {
  messages: Message[];
  nextCursor: string | null;
}

export async function getMessages(
  matchId: string,
  cursor?: string,
  limit: number = 30
): Promise<MessagesResponse> {
  const params: Record<string, string | number> = { limit };
  if (cursor) {
    params.cursor = cursor;
  }
  const { data } = await api.get<MessagesResponse>(`/messages/${matchId}`, {
    params,
  });
  return data;
}

export interface UploadMediaResponse {
  id: string;
  url: string;
  type: MessageType;
}

export async function uploadMedia(
  matchId: string,
  uri: string,
  type: MessageType
): Promise<UploadMediaResponse> {
  const formData = new FormData();
  const filename = uri.split('/').pop() || 'file';
  const match = /\.(\w+)$/.exec(filename);
  const mimeType = type === 'IMAGE'
    ? `image/${match?.[1] || 'jpeg'}`
    : type === 'VOICE'
      ? 'audio/m4a'
      : 'image/gif';

  formData.append('file', {
    uri,
    name: filename,
    type: mimeType,
  } as unknown as Blob);

  formData.append('type', type);

  const { data } = await api.post<UploadMediaResponse>(
    `/messages/${matchId}/upload`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}
