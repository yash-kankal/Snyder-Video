const { cloudinary } = require("../config/cloudinary");

/**
 * Upload a file buffer/temp-path to Cloudinary.
 * @param {Buffer|string} file  - file data or temp path
 * @param {object} options      - cloudinary upload options (folder, resource_type, etc.)
 */
async function uploadFile(file, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    if (Buffer.isBuffer(file)) {
      stream.end(file);
    } else {
      // file is a temp path string
      cloudinary.uploader
        .upload(file, options)
        .then(resolve)
        .catch(reject);
    }
  });
}

/**
 * Upload from an express-fileupload file object.
 */
async function uploadFromRequest(fileObj, options = {}) {
  if (!fileObj) {
    throw new Error("File is required");
  }

  if (fileObj && fileObj.tempFilePath) {
    return cloudinary.uploader.upload(fileObj.tempFilePath, options);
  }

  return new Promise((resolve, reject) => {
    if (!fileObj.data || fileObj.data.length === 0) {
      reject(new Error("Empty file"));
      return;
    }
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
    stream.end(fileObj.data);
  });
}

async function deleteFile(publicId, options = {}) {
  return cloudinary.uploader.destroy(publicId, options);
}

module.exports = { uploadFile, uploadFromRequest, deleteFile };
