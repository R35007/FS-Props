import { getStats, getImageDetails, getAudioDetails, getVideoDetails, StatsProps, ImageProps, AudioProps, VideoProps } from './utils';

export const properties = async (fsPath: string): Promise<StatsProps & ImageProps & AudioProps & VideoProps> => {
  const stats = await getStats(fsPath);
  const image: any = stats.mimeType?.includes('image') ? await getImageDetails(fsPath) : {};
  const audio = stats.mimeType?.includes('audio') ? await getAudioDetails(fsPath) : {};
  const video = stats.mimeType?.includes('video') ? await getVideoDetails(fsPath) : {};
  return { ...stats, ...image, ...audio, ...video };
}