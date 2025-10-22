const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'HealthMate AI <noreply@healthmate.ai>',
    to: email,
    subject: 'Verify Your Email - HealthMate AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366F1;">Welcome to HealthMate AI, ${name}!</h2>
        <p>Thank you for registering. Please verify your email address to complete your registration.</p>
        <p>Your verification code is:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #6366F1; letter-spacing: 5px;">${token}</h1>
        </div>
        <p>This code will expire in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The HealthMate AI Team</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, token) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'HealthMate AI <noreply@healthmate.ai>',
    to: email,
    subject: 'Password Reset Request - HealthMate AI',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #6366F1;">Password Reset Request</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password. Use the code below to reset it:</p>
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #6366F1; letter-spacing: 5px;">${token}</h1>
        </div>
        <p>This code will expire in 30 minutes.</p>
        <p>If you didn't request a password reset, please ignore this email.</p>
        <br>
        <p>Best regards,<br>The HealthMate AI Team</p>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', email);
  } catch (error) {
    console.error('❌ Email sending error:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
