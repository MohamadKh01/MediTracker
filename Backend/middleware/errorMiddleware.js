// global error handler
// catch errors and send a clean JSON response instead of html crash page
const errorHandler = (err, req, res, next) => {
    // default error code is 500 (server error)
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    res.status(statusCode);

    res.json({
        success: false,
        message: err.message,
        // show detailed error stack only in development mode
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = errorHandler;