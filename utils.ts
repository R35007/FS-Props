import * as ExifReader from "exifreader";
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from "fs";
import * as fsProm from "fs/promises";
import humanizeDuration from "humanize-duration";
import imageSize from "image-size";
import { ISizeCalculationResult } from 'image-size/dist/types/interface';
import * as mime from "mime";
import moment from "moment";
import * as path from "path";

const ffprobe = require('@ffprobe-installer/ffprobe');
ffmpeg.setFfprobePath(ffprobe.path);

const getDeepStats = async (fsPath: string): Promise<fs.Stats[]> => {
  const files = await fsProm.readdir(fsPath, { withFileTypes: true });

  const statsList = files.map(async file => {
    const filePath = path.join(fsPath, file.name);

    const fsStats = await fsProm.stat(filePath);

    if (file.isFile()) return [fsStats];

    // If Directory then get all nested files and folder stats
    const fsStatsList = await getDeepStats(filePath);
    return [fsStats, ...fsStatsList];
  });

  const fsStatsList = await Promise.all(statsList);

  return fsStatsList.flat(Infinity).filter(Boolean) as fs.Stats[];
};

const getSizeAndContains = async (fsPath: string) => {
  const stats = await fsProm.stat(fsPath);

  if (stats.isFile()) return { size: stats.size, contains: undefined };

  // If Directory then get folder size and contains
  const allStats = await getDeepStats(fsPath);

  const contains = {
    files: allStats.filter(stat => stat.isFile()).length,
    folders: allStats.filter(stat => stat.isDirectory()).length,
  };

  const folderSize = allStats.filter(stat => stat.isFile).reduce((res, stat) => res + stat.size, 0);
  return { size: folderSize, contains };
};

const getTimeStamps = (stats: fs.Stats) => {
  const created = stats.birthtime;
  const changed = stats.ctime;
  const modified = stats.mtime;
  const accessed = stats.atime;

  const createdLocal = stats.birthtime.toLocaleString();
  const changedLocal = stats.ctime.toLocaleString();
  const modifiedLocal = stats.mtime.toLocaleString();
  const accessedLocal = stats.atime.toLocaleString();

  const createdRelative = moment(stats.birthtime).fromNow();
  const changedRelative = moment(stats.ctime).fromNow();
  const modifiedRelative = moment(stats.mtime).fromNow();
  const accessedRelative = moment(stats.atime).fromNow();

  const createdMs = stats.birthtimeMs;
  const changedMs = stats.ctimeMs;
  const modifiedMs = stats.mtimeMs;
  const accessedMs = stats.atimeMs;



  return {
    created,
    changed,
    modified,
    accessed,
    createdMs,
    changedMs,
    modifiedMs,
    accessedMs,
    createdLocal,
    changedLocal,
    modifiedLocal,
    accessedLocal,
    createdRelative,
    changedRelative,
    modifiedRelative,
    accessedRelative
  }
}

// Converts the file size from Bytes to KB | MB | GB | TB
export const convertBytes = (bytes: number, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], showBytes = true): string => {
  if (bytes === 0) return '0 bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return bytes + ' ' + sizes[i];
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i] + (showBytes ? ` (${bytes} bytes)` : "");
};

export const ffprobePromise = async (filePath: string) => {
  const metaData: ffmpeg.FfprobeData = await new Promise((resolve, reject) =>
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    })
  );
  return metaData;
};

export type StatsProps = {
  fileName: string;
  baseName: string;
  extension?: string;
  directory: string;
  location: string;
  size: number;
  sizePretty: string;
  type: string;
  mimeType?: string;
  isFile: boolean;
  isDirectory: boolean;
  containedFiles?: number;
  containedFolders?: number;
  contains?: { files: number; folders: number };
  containsPretty?: string;
  timestamps: {
    created: Date;
    changed: Date;
    modified: Date;
    accessed: Date;
    createdMs: number;
    changedMs: number;
    modifiedMs: number;
    accessedMs: number;
    createdLocal: string;
    changedLocal: string;
    modifiedLocal: string;
    accessedLocal: string;
    createdRelative: string;
    changedRelative: string;
    modifiedRelative: string;
    accessedRelative: string;
  };
  stats: fs.Stats;
}

export const getStats = async (fsPath: string): Promise<StatsProps> => {
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


const getImageDimensions = (metaData: ExifReader.Tags & ExifReader.XmpTags & ExifReader.IccTags) => {
  const width = metaData.ImageWidth?.value ?? metaData["Image Width"]?.description ?? metaData.PixelXDimension?.value;
  const height = metaData.ImageLength?.value ?? metaData["Image Height"]?.description ?? metaData.PixelYDimension?.value;
  return {
    dimensions: typeof width !== "undefined" && typeof height !== "undefined" ? `${width} x ${height} pixels` : undefined,
    width,
    height,
  };
};

const getImageResolution = (metaData: ExifReader.Tags & ExifReader.XmpTags & ExifReader.IccTags) => {
  const xResolution = parseInt(metaData.XResolution?.description || "0", 10);
  const yResolution = parseInt(metaData.YResolution?.description || "0", 10);
  return {
    resolution: typeof xResolution !== "undefined" && typeof yResolution !== "undefined" ? `${xResolution} x ${yResolution} Dpi` : undefined,
    xResolution,
    yResolution,
  };
};

export type ImageProps = {
  isImage?: boolean;
  orientation?: string | number;
  bitDepth?: string;
  colorType?: string;
  subSampling?: string;
  compression?: string;
  filter?: string;
  resourceURL?: string;
  resolution?: string;
  xResolution?: number;
  yResolution?: number;
  dimensions?: string;
  width?: string | number;
  height?: string | number;
  metaData?: ExifReader.Tags & ExifReader.XmpTags & ExifReader.IccTags | ISizeCalculationResult
}

export const getImageDetails = async (imagePath: string): Promise<ImageProps> => {
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

export type AudioProps = {
  isAudio?: boolean;
  title?: string | number;
  album?: string | number;
  artist?: string | number;
  composer?: string | number;
  genre?: string | number;
  year?: string | number;
  duration?: number;
  durationPretty?: string;
  bitRate?: number;
  bitRatePretty?: string;
  channels?: string | number;
  metaData?: ffmpeg.FfprobeData;
}

export const getAudioDetails = async (audioPath: string): Promise<AudioProps> => {
  try {
    const metaData = await ffprobePromise(audioPath);
    const audio = metaData.streams.find(st => st.codec_type === 'audio') || {} as ffmpeg.FfprobeStream;
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

export type VideoProps = {
  isVideo?: boolean;
  dimensions?: string;
  width?: number;
  height?: number;
  resolution?: string;
  duration?: number;
  durationPretty?: string;
  bitRate?: number;
  bitRatePretty?: string;
  frameRate?: number;
  frameRatePretty?: string;
  framesPerSecond?: string;
  ratio?: string;
  metaData?: ffmpeg.FfprobeData;
}

export const getVideoDetails = async (videoPath: string): Promise<VideoProps> => {
  try {
    const metaData = await ffprobePromise(videoPath);
    const video = metaData.streams.find(st => st.codec_type === 'video') || {} as ffmpeg.FfprobeStream;

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