import * as ExifReader from "exifreader";
import * as ffmpeg from 'fluent-ffmpeg';
import { FfprobeStream } from 'fluent-ffmpeg';
import * as fs from "fs";
import * as fsProm from "fs/promises";
import humanize from "humanize-duration";
import imageSize from "image-size";
import * as mime from "mime";
import moment from "moment";
import * as path from "path";

import { AudioProps, ImageProps, Properties, StatsProps, VideoProps } from './types';

try {
  const ffprobe = require('node-ffprobe-installer');
  ffmpeg.setFfprobePath(ffprobe.path);
} catch (err) {
  console.error(err);
}

const getSizeAndContains = async (fsPath: string) => {
  const stats = await fsProm.stat(fsPath);

  if (stats.isFile()) return { size: stats.size, contains: undefined };

  const contains = { files: 0, folders: 0 };

  const dirSizes = async (fsPath: string): Promise<number[]> => {
    const files = await fsProm.readdir(fsPath, { withFileTypes: true });
    const statsList = files.map(async file => {
      const filePath = path.join(fsPath, file.name);
      const { size } = await fsProm.stat(filePath);
      if (file.isFile()) { contains.files++; return [size] };
      contains.folders++;
      const sizes = await dirSizes(filePath);
      return [size, ...sizes];
    });
    const fsStatsList = await Promise.all(statsList);
    return fsStatsList.flat(Infinity).filter(Boolean) as number[];
  };

  const dirSize = (await dirSizes(fsPath)).reduce((res, size) => res + size, 0);

  return { size: dirSize, contains };
};

const getSizeAndContainsSync = (fsPath: string) => {
  const stats = fs.statSync(fsPath);

  if (stats.isFile()) return { size: stats.size, contains: undefined };

  const contains = { files: 0, folders: 0 };

  const dirSizes = (fsPath: string): number[] => {
    const files = fs.readdirSync(fsPath, { withFileTypes: true });
    const statsList = files.map(file => {
      const filePath = path.join(fsPath, file.name);
      const { size } = fs.statSync(filePath);
      if (file.isFile()) { contains.files++; return [size] };
      contains.folders++;
      const sizes = dirSizes(filePath);
      return [size, ...sizes];
    });
    return statsList.flat(Infinity).filter(Boolean) as number[];
  };

  const dirSize = dirSizes(fsPath).reduce((res, size) => res + size, 0);

  return { size: dirSize, contains };
};

/**
 * It sets the path to the ffprobe executable
 * @param {string} ffprobePath - The path to the ffprobe binary.
 */
export const setFfprobePath = (ffprobePath: string) => {
  ffmpeg.setFfprobePath(ffprobePath);
}

/**
 * It returns an promise object with the file's creation, change, modification, and access times, as well as
 * the same times in milliseconds, local time, and relative time
 * @param {string} fsPath - The path to the file or directory.
 */
export const timeStamp = async (fsPathOrStat: string | fs.Stats) => {
  const stats = typeof fsPathOrStat === 'string' ? await fsProm.stat(fsPathOrStat) : fsPathOrStat;
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

/**
 * It returns an object with the file's creation, change, modification, and access times, as well as
 * the same times in milliseconds, local time, and relative time
 * @param {string} fsPath - The path to the file or directory.
 */
export const timeStampSync = (fsPathOrStat: string | fs.Stats) => {
  const stats = typeof fsPathOrStat === 'string' ? fs.statSync(fsPathOrStat) : fsPathOrStat;
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

/**
 * It takes a number of bytes and returns a string with the number of bytes in a human readable format.
 * @param {number} bytes - The number of bytes to convert.
 * @param sizes - The array of sizes to use.
 * @param [showBytes=true] - boolean - Whether to show the bytes in the string.
 * @returns A function that takes two parameters, bytes and sizes, and returns a string.
 */
export const convertBytes = (bytes: number, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], showBytes = true): string => {
  if (bytes === 0) return '0 bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  if (i === 0) return bytes + ' ' + sizes[i];
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i] + (showBytes ? ` (${bytes} bytes)` : "");
};

/**
 * It takes a file path as a string, and returns a promise that resolves to the metadata of the file
 * @param {string} filePath - The path to the file you want to get metadata from.
 * @returns The return type is a Promise.
 */
export const ffprobePromise = async (filePath: string) => {
  const metaData: ffmpeg.FfprobeData = await new Promise((resolve, reject) =>
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);
      else resolve(metadata);
    })
  );
  return metaData;
};

/**
 * It takes a duration in milliseconds and returns a human readable string
 * @param {number} durationInMilliSeconds - number - The duration in milliseconds
 * @param options - [humanize-duration options](https://www.npmjs.com/package/humanize-duration)
 */
export const humanizeDuration = (durationInMilliSeconds?: number | string, options: object = {}) => {
  if (typeof durationInMilliSeconds === "undefined") return undefined;

  const duration = typeof durationInMilliSeconds === 'number' ? durationInMilliSeconds : parseFloat(durationInMilliSeconds);
  return humanize(duration, { maxDecimalPoints: 2, ...options });
}

const getImageDimensions = (metaData: Awaited<ReturnType<typeof ExifReader.load>>) => {
  const width = metaData.ImageWidth?.value ?? metaData["Image Width"]?.description ?? metaData.PixelXDimension?.value;
  const height = metaData.ImageLength?.value ?? metaData["Image Height"]?.description ?? metaData.PixelYDimension?.value;
  return {
    dimensions: typeof width !== "undefined" && typeof height !== "undefined" ? `${width} x ${height} pixels` : undefined,
    width,
    height,
  };
};

const getImageResolution = (metaData: Awaited<ReturnType<typeof ExifReader.load>>) => {
  const xResolution = parseInt(metaData.XResolution?.description || "0", 10);
  const yResolution = parseInt(metaData.YResolution?.description || "0", 10);
  return {
    resolution: xResolution || yResolution ? `${xResolution} x ${yResolution} Dpi` : undefined,
    xResolution,
    yResolution,
  };
};

/**
 * It returns an promise object with all the properties of the file or folder, 
 * including the number of files and folders it contains
 * @param {string} fsPath - The path to the file or folder
 */
export const stat = async (fsPath: string): Promise<StatsProps> => {
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
  const children = isFile ? [] : await fsProm.readdir(fsPath, { withFileTypes: true });

  const timestamps = await timeStamp(stats);
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
    children,
    containedFiles: contains?.files,
    containedFolders: contains?.folders,
    contains,
    containsPretty: contains ? `${contains.files} Files, ${contains.folders} Folders` : undefined,
    ...timestamps,
    stats,
  };
};

/**
 * It returns an object with all the properties of the file or folder, 
 * including the number of files and folders it contains
 * @param {string} fsPath - The path to the file or folder
 */
export const statSync = (fsPath: string): StatsProps => {
  const stats = fs.statSync(fsPath);
  const isFile = stats.isFile();
  const fileName = path.basename(fsPath);
  const extension = isFile ? path.extname(fsPath) : undefined;
  const baseName = path.basename(fsPath, extension);
  const isDirectory = !stats.isFile();
  const location = fsPath.replace(/\\/g, "/");
  const directory = path.dirname(fsPath).replace(/\\/g, "/");
  const type = isFile ? "File" : "Folder";
  const mimeType = isFile ? mime.getType(fsPath) || '[unknown]' : undefined;
  const children = isFile ? [] : fs.readdirSync(fsPath, { withFileTypes: true });

  const timestamps = timeStampSync(stats);
  const { size, contains } = getSizeAndContainsSync(fsPath);

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
    children,
    containedFiles: contains?.files,
    containedFolders: contains?.folders,
    contains,
    containsPretty: contains ? `${contains.files} Files, ${contains.folders} Folders` : undefined,
    ...timestamps,
    stats,
  };
};

/**
 * It returns a promise stat list of all the files in a directory and its subdirectories.
 * @param {string} fsPath - The path to the file or directory you want to get the stats for.
 * @returns An array of StatsProps[]
 */
export const deepStat = async (fsPath: string): Promise<StatsProps[]> => {
  const fsStats = await stat(fsPath);
  if (!fsStats) return [];
  if (fsStats.isFile) return [fsStats]

  const statsList = fsStats.children.map(async file => {
    const filePath = path.join(fsPath, file.name);
    const fsStatsList = await deepStat(filePath);
    return fsStatsList;
  });

  const fsStatsList = await Promise.all(statsList);
  return [fsStats, ...fsStatsList.flat(Infinity).filter(Boolean)] as StatsProps[];
};

/**
 * It returns a stat list of all the files in a directory and its subdirectories.
 * @param {string} fsPath - The path to the file or directory you want to get the stats for.
 * @returns An array of StatsProps[]
 */
export const deepStatSync = (fsPath: string): StatsProps[] => {
  const fsStats = statSync(fsPath);
  if (!fsStats) return [];
  if (fsStats.isFile) return [fsStats]

  const statsList = fsStats.children.map(file => {
    const filePath = path.join(fsPath, file.name);
    const fsStatsList = deepStatSync(filePath);
    return fsStatsList;
  });

  return [fsStats, ...statsList.flat(Infinity).filter(Boolean)] as StatsProps[];
};

/**
 * It takes a path to an image, and returns an object with the image's properties
 * @param {string} imagePath - string
 */
export const imageProps = async (imagePath: string): Promise<ImageProps> => {
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
  } catch (error: any) {
    console.error(error.message);
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
    } catch (error: any) {
      console.error(error.message);
      return {} as ImageProps;
    }
  }
};

/**
 * It takes a path to an audio file, and returns an object with the audio file's properties
 * @param {string} audioPath - string - The path to the audio file
 */
export const audioProps = async (audioPath: string): Promise<AudioProps> => {
  try {
    const metaData = await ffprobePromise(audioPath);
    const audio = metaData.streams.find(st => st.codec_type === 'audio') || {} as FfprobeStream;
    const tags = metaData.format.tags || {};

    const duration = metaData.format.duration ?? 0;
    const durationMs = duration * 1000;
    const durationPretty = humanizeDuration(durationMs, { maxDecimalPoints: 2 });

    const bitRate = parseInt(audio.bit_rate || '0', 10);
    const bitRatePretty = bitRate ? convertBytes(bitRate, ['bps', 'kbps', 'mbps'], false) : undefined;

    const channels = typeof audio.channels !== 'undefined' ? audio.channel_layout ? `${audio.channels} (${audio.channel_layout})` : audio.channels : undefined;

    return {
      isAudio: true,
      title: tags.title,
      album: tags.album,
      artist: tags.artist,
      composer: tags.composer,
      genre: tags.genre,
      year: tags.date,
      duration,
      durationMs,
      durationPretty,
      bitRate,
      bitRatePretty,
      channels,
      metaData,
    };
  } catch (error: any) {
    console.error(error.message);
    return {} as AudioProps;
  }
};

/**
 * It takes a video path, and returns an object with the video's properties
 * @param {string} videoPath - string - The path to the video file
 */
export const videoProps = async (videoPath: string): Promise<VideoProps> => {
  try {
    const metaData = await ffprobePromise(videoPath);
    const video = metaData.streams.find(st => st.codec_type === 'video') || {} as FfprobeStream;

    const dimensions = `${video.width} x ${video.height} pixels`;

    const duration = metaData.format.duration ?? 0;
    const durationMs = duration * 1000;
    const durationPretty = humanizeDuration(durationMs, { maxDecimalPoints: 2 });

    const bitRate = parseInt(video.bit_rate || '0', 10);
    const bitRatePretty = bitRate ? convertBytes(bitRate, ['bps', 'kbps', 'mbps'], false) : undefined;

    const frameRate = video.r_frame_rate ? parseFloat(eval(video.r_frame_rate || "0").toFixed(2)) : undefined;
    const frameRatePretty = frameRate ? `${eval(video.r_frame_rate || "0").toFixed(2)} fps` : undefined;

    return {
      isVideo: true,
      dimensions,
      width: video.width,
      height: video.height,
      resolution: dimensions,
      duration,
      durationMs,
      durationPretty,
      bitRate,
      bitRatePretty,
      frameRate,
      frameRatePretty,
      framesPerSecond: frameRatePretty,
      ratio: video.display_aspect_ratio,
      metaData,
    };
  } catch (error: any) {
    console.error(error.message);
    return {} as VideoProps;
  }
};

/**
 * It returns a promise that resolves to an object containing the properties of a file, including its
 * file system properties, image properties, audio properties, and video properties
 * @param {string} fsPath - The path to the file you want to get the properties of.
 */
export const props = async (fsPath: string): Promise<Properties> => {
  const fsStats = await stat(fsPath);
  const image: any = fsStats.mimeType?.includes('image') ? await imageProps(fsPath) : {};
  const audio = fsStats.mimeType?.includes('audio') ? await audioProps(fsPath) : {};
  const video = fsStats.mimeType?.includes('video') ? await videoProps(fsPath) : {};
  return { ...fsStats, ...image, ...audio, ...video };
}

export const deepProps = async (fsPath: string): Promise<Properties[]> => {
  const fsProps = await props(fsPath);
  if (!fsProps) return [];
  if (fsProps.isFile) return [fsProps]

  const files = await fsProm.readdir(fsPath, { withFileTypes: true });

  const propsList = files.map(async file => {
    const filePath = path.join(fsPath, file.name);
    const fsPropsList = await deepProps(filePath);
    return fsPropsList;
  });

  const fsPropsList = await Promise.all(propsList);
  return [fsProps, ...fsPropsList.flat(Infinity).filter(Boolean)] as Properties[];
}