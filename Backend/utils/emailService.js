// EMAIL VERIFICATION LOGIC 5/6
// const nodemailer = require('nodemailer');

// const transporter = nodemailer.createTransport({
//     service: 'gmail',
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
// });

// const sendVerificationEmail = async (toEmail, OTP) => {
//     return transporter.sendMail({
//         from: `"My App" <${process.env.EMAIL_USER}>`,
//         to: toEmail,
//         subject: 'Your Email Verification Code',
//         html: `
//             <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
//                 <h2>Welcome to My App!</h2>
//                 <p>Your Verification Code is:</p>
//                 <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #007AFF; margin: 20px 0;">
//                     ${OTP}
//                 </div>
//                 <p>This code will expire in 15 minutes.</p>
//             </div>
//             `,
//     });
// };

// module.exports = { sendVerificationEmail };