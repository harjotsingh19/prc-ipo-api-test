const multer = require('multer');

// Set up storage engine for Multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Configure Multer with limits
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 52428800 // Limit file size to 50 MB
    }
});

module.exports = upload;