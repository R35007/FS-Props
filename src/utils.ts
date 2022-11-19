import * as ExifReader from "exifreader";
import * as ffmpeg from 'fluent-ffmpeg';
import * as fs from "fs";
import * as fsProm from "fs/promises";
import moment from "moment";
import * as path from "path";

const ffprobe = require('@ffprobe-installer/ffprobe');
ffmpeg.setFfprobePath(ffprobe.path);

export const getSizeAndContains = async (fsPath: string) => {
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

export const getTimeStamps = (stats: fs.Stats) => {
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

export const getImageDimensions = (metaData: ExifReader.Tags & ExifReader.XmpTags & ExifReader.IccTags) => {
  const width = metaData.ImageWidth?.value ?? metaData["Image Width"]?.description ?? metaData.PixelXDimension?.value;
  const height = metaData.ImageLength?.value ?? metaData["Image Height"]?.description ?? metaData.PixelYDimension?.value;
  return {
    dimensions: typeof width !== "undefined" && typeof height !== "undefined" ? `${width} x ${height} pixels` : undefined,
    width,
    height,
  };
};

export const getImageResolution = (metaData: ExifReader.Tags & ExifReader.XmpTags & ExifReader.IccTags) => {
  const xResolution = parseInt(metaData.XResolution?.description || "0", 10);
  const yResolution = parseInt(metaData.YResolution?.description || "0", 10);
  return {
    resolution: typeof xResolution !== "undefined" && typeof yResolution !== "undefined" ? `${xResolution} x ${yResolution} Dpi` : undefined,
    xResolution,
    yResolution,
  };
};

