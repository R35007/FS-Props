import * as ExifReader from "exifreader";
import { FfprobeStream } from 'fluent-ffmpeg';
import * as fsProm from "fs/promises";
import humanizeDuration from "humanize-duration";
import imageSize from "image-size";
import * as mime from "mime";
import * as path from "path";
import { AudioProps, ImageProps, StatsProps, VideoProps } from './types';
import { convertBytes, ffprobePromise, getImageDimensions, getImageResolution, getSizeAndContains, getTimeStamps } from './utils';


export const stats = async (fsPath: string): Promise<StatsProps> => {
  const stats = await fsProm.stat(fsPath);
  const isFile = stats.isFile();
  const fileName = path.basename(fsPath);
  const extension = isFile ? path.extname(fsPath) : undefined;
  const baseName = path.basename(fsPath, extension);
  const isDirectory = !stats.isFile();
  const location = fsPath.replace(/\\/g, "/");
  const directory = path.dirname(fsPath).replace(/\\/g, "/");
  const type = isFile ? "File" : "Folder";
  const mimeType = isFile ? mime.getType(fsPath) || '[unknown]' : undefined;
  const timestamps = getTimeStamps(stats);

  const { size, contains } = await getSizeAndContains(fsPath);

  return {
    fileName,
    baseName,
    extension,
    directory,
    location,
    size,
    sizePretty: convertBytes(size),
    type,
    mimeType,
    isFile,
    isDirectory,
    containedFiles: contains?.files,
    containedFolders: contains?.folders,
    contains,
    containsPretty: contains ? `${contains.files} Files, ${contains.folders} Folders` : undefined,
    timestamps,
    stats,
  };
};

export const deepStats = async (fsPath: string): Promise<StatsProps[]> => {
  const files = await fsProm.readdir(fsPath, { withFileTypes: true });

  const statsList = files.map(async file => {
    const filePath = path.join(fsPath, file.name);

    const fsStats = await stats(filePath);

    if (file.isFile()) return [fsStats];

    // If Directory then get all nested files and folder stats
    const fsStatsList = await deepStats(filePath);
    return [fsStats, ...fsStatsList];
  });

  const fsStatsList = await Promise.all(statsList);

  return fsStatsList.flat(Infinity).filter(Boolean) as StatsProps[];
};

export const imageProperties = async (imagePath: string): Promise<ImageProps> => {
  try {
    const metaData = await ExifReader.load(imagePath);
    return {
      isImage: true,
      ...getImageDimensions(metaData),
      ...getImageResolution(metaData),
      orientation: metaData.Orientation?.description,
      bitDepth: metaData["Bit Depth"]?.description ?? metaData.BitDepth?.description ?? metaData["Bits Per Sample"]?.description ?? metaData.BitsPerSample?.description,
      colorType: metaData["Color Type"]?.description ?? metaData.ColorType?.description ?? metaData["Color Space"]?.description ?? metaData.ColorSpace?.description,
      subSampling: metaData["Subsampling"]?.description ?? metaData.YCbCrSubSampling?.description,
      compression: metaData.Compression?.description,
      filter: metaData.Filter?.description,
      resourceURL: metaData.ResourceURL?.description,
      metaData,
    };
  } catch (err) {
    try {
      const metaData = imageSize(imagePath);
      return {
        isImage: true,
        dimensions: typeof metaData.width !== "undefined" && typeof metaData.height !== "undefined" ? `${metaData.width} x ${metaData.height} pixels` : undefined,
        height: metaData.height,
        width: metaData.width,
        orientation: metaData.orientation,
        metaData,
      };
    } catch (err) {
      return {} as ImageProps;
    }
  }
};

export const audioProperties = async (audioPath: string): Promise<AudioProps> => {
  try {
    const metaData = await ffprobePromise(audioPath);
    const audio = metaData.streams.find(st => st.codec_type === 'audio') || {} as FfprobeStream;
    const tags = metaData.format.tags || {};

    const duration = metaData.format.duration ?? 0;

    return {
      isAudio: true,
      title: tags.title,
      album: tags.album,
      artist: tags.artist,
      composer: tags.composer,
      genre: tags.genre,
      year: tags.date,
      duration,
      durationPretty: duration ? humanizeDuration(duration * 1000, { maxDecimalPoints: 2 }) : undefined,
      bitRate: metaData.format.bit_rate || 0,
      bitRatePretty: metaData.format.bit_rate ? convertBytes(metaData.format.bit_rate || 0, ['bps', 'kbps', 'mbps'], false) : undefined,
      channels: typeof audio.channels !== 'undefined' ? audio.channel_layout ? `${audio.channels} (${audio.channel_layout})` : audio.channels : "",
      metaData,
    };
  } catch (error: any) {
    return {} as AudioProps;
  }
};

export const videoProperties = async (videoPath: string): Promise<VideoProps> => {
  try {
    const metaData = await ffprobePromise(videoPath);
    const video = metaData.streams.find(st => st.codec_type === 'video') || {} as FfprobeStream;

    const dimensions = `${video.width} x ${video.height} pixels`;
    const duration = metaData.format.duration ?? 0;
    const bitRate = parseInt(video.bit_rate || '0', 10);
    const frameRate = video.r_frame_rate ? parseFloat(eval(video.r_frame_rate || "0").toFixed(2)) : undefined;
    const frameRatePretty = frameRate ? `${eval(video.r_frame_rate || "0").toFixed(2)} fps` : undefined;

    return {
      isVideo: true,
      dimensions,
      width: video.width,
      height: video.height,
      resolution: dimensions,
      duration,
      durationPretty: duration ? humanizeDuration(duration * 1000, { maxDecimalPoints: 2 }) : undefined,
      bitRate,
      bitRatePretty: bitRate ? convertBytes(bitRate || 0, ['bps', 'kbps', 'mbps'], false) : undefined,
      frameRate,
      frameRatePretty,
      framesPerSecond: frameRatePretty,
      ratio: video.display_aspect_ratio,
      metaData,
    };
  } catch (error: any) {
    return {} as VideoProps;
  }
};

export const properties = async (fsPath: string): Promise<StatsProps & ImageProps & AudioProps & VideoProps> => {
  const fsStats = await stats(fsPath);
  const image: any = fsStats.mimeType?.includes('image') ? await imageProperties(fsPath) : {};
  const audio = fsStats.mimeType?.includes('audio') ? await audioProperties(fsPath) : {};
  const video = fsStats.mimeType?.includes('video') ? await videoProperties(fsPath) : {};
  return { ...fsStats, ...image, ...audio, ...video };
}