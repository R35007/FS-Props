import { getStats, getImageDetails, getAudioDetails, getVideoDetails } from './utils';

export type Properties = Promise<
  ReturnType<typeof getStats>
  & ReturnType<typeof getImageDetails>
  & ReturnType<typeof getAudioDetails>
  & ReturnType<typeof getVideoDetails>
>

export const properties = async (fsPath: string): Properties => {
  const stats = await getStats(fsPath);
  const image: any = stats.mimeType?.includes('image') ? await getImageDetails(fsPath) : {};
  const audio = stats.mimeType?.includes('audio') ? await getAudioDetails(fsPath) : {};
  const video = stats.mimeType?.includes('video') ? await getVideoDetails(fsPath) : {};
  return { ...stats, ...image, ...audio, ...video };
}