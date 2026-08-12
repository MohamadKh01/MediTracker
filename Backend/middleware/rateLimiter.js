// EMAIL VERIFICATION LOGIC 2/6
// const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// // limiter for resend verification code
// const resendVerificationLimiter = rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 3,     // limit each ip to 3 resend requests per windowMS
//     standardHeaders: true,      // return rate limit ingo in RateLimit-* info
//     legacyHeaders: false,       // disable X-Ratelimit-* headers
//     keyGenerator: (req) => {    // custom keyGenerator to limit by email falling back to ip
//         return req.body?.email ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req);
//     },
//     handler: (req, res) => {
//         return res.status(429).json({
//             success: false,
//             message: "Too many resend attempts. Please wait 15 minutes before requesting a new code.",
//         });
//     }
// });

// // limiter for submitting verification code
// const verifyEmailLimiter = rateLimit({
//     windowMs: 5 * 60 * 1000,
//     max: 5,
//     standardHeaders: true,
//     legacyHeaders: false,
//     keyGenerator: (req) => {
//         return req.body?.email ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req);
//     },
//     handler: (req, res) => {
//         return res.status(429).json({
//             success: false,
//             message: "Too many failed attempts. Please wait 5 minutes before requesting a new code.",
//         });
//     }
// });

// // clear rate limit counter for a specific request
// const resetVerifyEmailLimit = (req) => {
//     const key = req.body?.email ? req.body.email.trim().toLowerCase() : ipKeyGenerator(req);
//     verifyEmailLimiter.resetKey(key);
// }

// module.exports = { resendVerificationLimiter, verifyEmailLimiter, resetVerifyEmailLimit };