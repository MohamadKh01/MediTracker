// track API calls
const logger = (req, res, next) => {
    // record start time
    const start = Date.now();

    // this function runs once the response is done sending
    res.on('finish', () => {
        // calculate time taken
        const duration = Date.now() - start;
        const date = new Date().toISOString().split('T')[0];

        console.log(`[${date}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });

    next();
}

module.exports = logger;