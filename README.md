# fs-props

FS-Props is a Javascript library that helps to parse image, audio, video or any file and folder and give its stats and properties of the respective file.

- It uses [exifreader](https://www.npmjs.com/package/exifreader?activeTab=readme) node package for image properties and [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) for audio and video properties.

- File `Name` and `Extension`.
- File or Folder `Size`.
- File `Mime Type`.
- Folders `Contains`.
- Image `Dimensions`, `Resolution`, `Bit Depth`, `Color Type`, `Sub Sampling`, `Compression`, `Filter`, `Resource URL`.
- File or Folder `Workspace`, `Directory` and `Location`.
- Audio `Title`, `Album`, `Artist`, `Composer`, `Genre`, `Bit Rate`, `Channels`, `Year`, `Duration`.
- Video `Dimensions`, `Frame Rate`, `Bit Rate`, `Ratio`, `Duration`.
- Timestamp of `created`, `changed`, `modified`, `accessed` with relative timestamp.

## Usage

### JS module:

```js
const fp = require("fs-props");

fp.properties("/path/to/file/or/folder").then((properties) => {
  console.log(properties);
});

// using async and await

(async () => {
  const properties = await fp.properties("/path/to/file/or/folder");
  console.log(properties);
})();

// All available promise methods

fp.stats(""); // To get only folder or file stats
fp.deepStats(""); // To get a list of all nested folder and file stats
fp.imageProperties(""); // Returns only image properties
fp.audioProperties(""); // Returns only audio properties
fp.videoProperties(""); // Returns only video properties

fp.properties(""); // Returns stats, audio, video, image properties
```

### CLI:

fs-props `[path]` `[path/to/save/properties]`

```sh
fs-props "/path/to/file/or/folder" "/path/to/save/properties.json"
```

### Sample Folder Properties

```jsonc
{
  "fileName": "FS Props",
  "baseName": "FS Props",
  "directory": "C:/Users/MYCOU/Work_Space/GitRepos",
  "location": "C:/Users/MYCOU/Work_Space/GitRepos/FS Props",
  "size": 177462033, // accumulation of all the nested file sizes from the given folder
  "sizePretty": "169.24 MB (177462033 bytes)",
  "type": "Folder",
  "isFile": false,
  "isDirectory": true,
  "containedFiles": 5622,
  "containedFolders": 623,
  "containsPretty": "5622 Files, 623 Folders",
  "contains": {
    "files": 5622,
    "folders": 623
  },
  "timestamps": {
    /*...*/
  },
  "stats": {
    /* ... fs stats */
  }
}
```

### Sample File Properties

```jsonc
{
  "fileName": "package.json",
  "baseName": "package",
  "extension": ".json",
  "directory": "C:/Users/MYCOU/Work_Space/GitRepos/FS Props",
  "location": "C:/Users/MYCOU/Work_Space/GitRepos/FS Props/package.json",
  "size": 1350,
  "sizePretty": "1.32 KB (1350 bytes)",
  "type": "File",
  "mimeType": "application/json",
  "isFile": true,
  "isDirectory": false,
  "timestamps": {
    /* ... */
  },
  "stats": {
    /* ... */
  }
}
```

### Timestamps

This timestamp object will be there for any file or folder

```jsonc
{
  /* ... File or Folder properties */
  "timestamps": {
    "created": "2022-11-18T05:19:45.711Z",
    "changed": "2022-11-18T16:15:52.365Z",
    "modified": "2022-11-18T16:15:52.365Z",
    "accessed": "2022-11-18T17:10:42.824Z",
    "createdMs": 1668748785710.9785,
    "changedMs": 1668788152365.1013,
    "modifiedMs": 1668788152365.1013,
    "accessedMs": 1668791442823.701,
    "createdLocal": "18/11/2022, 10:49:45 am",
    "changedLocal": "18/11/2022, 9:45:52 pm",
    "modifiedLocal": "18/11/2022, 9:45:52 pm",
    "accessedLocal": "18/11/2022, 10:40:42 pm",
    "createdRelative": "12 hours ago",
    "changedRelative": "an hour ago",
    "modifiedRelative": "an hour ago",
    "accessedRelative": "a few seconds ago"
  }
}
```

### FS Stats

This is node stats that returned using `fs.stat()` method.

```jsonc
{
  /* ... File or Folder properties */
  /* ... timestamp properties */
  "stats": {
    "dev": 3569872940,
    "mode": 33206,
    "nlink": 1,
    "uid": 0,
    "gid": 0,
    "rdev": 0,
    "blksize": 4096,
    "ino": 6192449487773464,
    "size": 1350,
    "blocks": 8,
    "atimeMs": 1668791442823.701,
    "mtimeMs": 1668788152365.1013,
    "ctimeMs": 1668788152365.1013,
    "birthtimeMs": 1668748785710.9785,
    "atime": "2022-11-18T17:10:42.824Z",
    "mtime": "2022-11-18T16:15:52.365Z",
    "ctime": "2022-11-18T16:15:52.365Z",
    "birthtime": "2022-11-18T05:19:45.711Z"
  }
}
```

### Image Properties

- `isImage` is set to true if the given file is a image.
- These are the following image properties that comes only if the given file is a image file.
- These properties are driven using [exifreader](https://www.npmjs.com/package/exifreader?activeTab=readme) node package.
- Some properties can be undefined depending upon the image.

```jsonc
{
  /* ... File or Folder properties */
  /* ... timestamp properties */
  /* ... Fs Stats properties */
  "isImage": true,
  "dimensions": "3840 x 2160 pixels",
  "width": 3840,
  "height": 2160,
  "resolution": "72 x 72 Dpi",
  "xResolution": 72,
  "yResolution": 72,
  "orientation": "top-left",
  "bitDepth": "8",
  "colorType": "RGB ",
  "subSampling": "YCbCr4:4:4 (1 1)",
  "compression": 1,
  "resourceURL": "https://stsci-opo.org/STScI-01FMN25HSDCX1M8BZTK69ZE1JP.jpg",
  "metadata": {
    /* ... from exif library. */
  }
}
```

> `Note`: The `metadata` is the full object from [exifreader](https://www.npmjs.com/package/exifreader?activeTab=readme) node package.
> For sample object please click [here](https://www.npmjs.com/package/exif?activeTab=readme#usage).

- The `metadata` may be undefined if the given image file is not recognizable by the exifreader.
- For example: exifreader cant able to read Icon files, so the `metadata` can be undefined but still we can see the `dimensions`, `width` and `height` of the image.

### Audio Properties

- `isAudio` is set to true if the given file is a audio file.
- These are the following audio properties that comes only if the given file is a audio file
- These properties are driven using [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) node package.
- Some properties can be undefined depending upon the audio.

```jsonc
{
  /* ... File or Folder properties */
  /* ... timestamp properties */
  /* ... Fs Stats properties */
  "isAudio": true,
  "title": "Yolo You Only Live Once - TamilTunes.com",
  "album": "Anegan (2014)",
  "artist": "Shail Hada,Ramya NSK,Richard,MC Vickey,Eden",
  "composer": "Harris Jayaraj",
  "year": "2014",
  "duration": 278.987755,
  "durationPretty": "4 minutes, 38.98 seconds",
  "bitRate": 299170,
  "bitRatePretty": "292.16 kbps",
  "channels": "2 (stereo)",
  "metadata": {
    /* ... from fluent-ffmpeg library. */
  }
}
```

> `Note`: The `metadata` is the full object from [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) node package.
> For sample object please click [here](https://www.npmjs.com/package/fluent-ffmpeg#reading-video-metadata).

- The `metadata` may be undefined if the given audio file is not recognizable by the fluent-ffmpeg.

### Video Properties

- `isVideo` is set to true if the given file is a video file.
- These are the following video properties that comes only if the given file is a video file
- These properties are driven using [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) node package.
- Some properties can be undefined depending upon the video.

```jsonc
{
  /* ... File or Folder properties */
  /* ... timestamp properties */
  /* ... Fs Stats properties */
  "isVideo": true,
  "dimensions": "1280 x 720 pixels",
  "width": 1280,
  "height": 720,
  "resolution": "1280 x 720 pixels",
  "duration": 6774.562,
  "durationPretty": "1 hour, 52 minutes, 54.56 seconds",
  "bitRate": 95316,
  "bitRatePretty": "93.08 kbps",
  "frameRate": 29.97,
  "frameRatePretty": "29.97 fps",
  "framesPerSecond": "29.97 fps",
  "ratio": "16:9",
  "metadata": {
    /* ... from fluent-ffmpeg library. */
  }
}
```

> `Note`: The `metadata` is the full object from [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) node package.
> For sample object please click [here](https://www.npmjs.com/package/fluent-ffmpeg#reading-video-metadata).

- The `metadata` may be undefined if the given video file is not recognizable by the fluent-ffmpeg.

## Author

**Sivaraman** - [sendmsg2siva.siva@gmail.com](sendmsg2siva.siva@gmail.com)

## License

MIT
