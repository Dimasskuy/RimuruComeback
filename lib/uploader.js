const axios = require('axios');
const FormData = require('form-data');
const { fromBuffer } = require('file-type');

/**
 * Upload image to Telegra.ph (Images only)
 * @param {Buffer} buffer Image Buffer
 * @returns {Promise<string>} Image URL
 */
const uploadToTelegra = async (buffer) => {
    try {
        const { ext } = await fromBuffer(buffer) || {};
        const form = new FormData();
        form.append('file', buffer, 'tmp.' + ext);
        const res = await axios.post('https://telegra.ph/upload', form, {
            headers: form.getHeaders()
        });
        const img = res.data;
        if (img.error) throw img.error;
        return 'https://telegra.ph' + img[0].src;
    } catch (e) {
        throw e;
    }
};

/**
 * Upload file to Catbox.moe (Files up to 200MB)
 * @param {Buffer} buffer File Buffer
 * @returns {Promise<string>} File URL
 */
const uploadToCatbox = async (buffer) => {
    try {
        const { ext } = await fromBuffer(buffer) || {};
        const form = new FormData();
        form.append('reqtype', 'fileupload');
        form.append('fileToUpload', buffer, `file.${ext || 'bin'}`);
        const res = await axios.post('https://catbox.moe/user/api.php', form, {
            headers: form.getHeaders()
        });
        return res.data;
    } catch (e) {
        throw e;
    }
};

/**
 * Upload file to Uguu.se (Temporary hosting)
 * @param {Buffer} buffer File Buffer
 * @returns {Promise<string>} File URL
 */
const uploadToUguu = async (buffer) => {
    try {
        const { ext } = await fromBuffer(buffer) || {};
        const form = new FormData();
        form.append("files[]", buffer, "tmp." + ext);
        const res = await axios.post("https://uguu.se/upload", form, {
            headers: {
                ...form.getHeaders(),
                "User-Agent": "Mozilla/5.0 (Linux; Android 10; Mobile)"
            }
        });
        return res.data.files[0].url;
    } catch (e) {
        throw e;
    }
};

/**
 * Smart Upload Function - Automatically selects provider based on file type
 * @param {Buffer} buffer File Buffer
 * @returns {Promise<string>} URL
 */
const uploadFile = async (buffer) => {
    const { mime } = await fromBuffer(buffer) || {};

    // Try Telegra.ph first for images (fastest & permanent)
    if (mime && mime.startsWith('image/')) {
        try {
            return await uploadToTelegra(buffer);
        } catch (e) {
            // Fallback to others if failed
        }
    }

    // Try Catbox (General file storage)
    try {
        return await uploadToCatbox(buffer);
    } catch (e) {
        // Fallback to Uguu
        try {
            return await uploadToUguu(buffer);
        } catch (e2) {
            throw new Error('All upload providers failed.');
        }
    }
};

module.exports = {
    uploadFile,
    uploadImage: uploadFile, // Alias for backward compatibility
    uploadToTelegra,
    uploadToCatbox,
    uploadToUguu
};
