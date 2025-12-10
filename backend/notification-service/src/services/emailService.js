const nodemailer = require('nodemailer');

// Create reusable transporter object using SMTP transport
let transporter = null;

const initEmailService = () => {
  // Use Gmail SMTP
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS // Use App Password for Gmail
    }
  });

  // Verify connection configuration
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter.verify((error, success) => {
      if (error) {
        console.log('Email service configuration error:', error.message);
        console.log('Email notifications will be logged only.');
      } else {
        console.log('Email service is ready to send messages');
      }
    });
  } else {
    console.log('SMTP credentials not configured. Email notifications will be logged only.');
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getEmailTemplate = (type, data) => {
  const baseStyle = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: #f8fafc;
    padding: 40px 20px;
  `;
  
  const cardStyle = `
    max-width: 600px;
    margin: 0 auto;
    background-color: white;
    border-radius: 16px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  `;

  const headerStyle = `
    padding: 30px;
    text-align: center;
    color: white;
  `;

  const contentStyle = `
    padding: 30px;
  `;

  const buttonStyle = `
    display: inline-block;
    padding: 12px 30px;
    background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);
    color: white;
    text-decoration: none;
    border-radius: 8px;
    font-weight: 600;
    margin-top: 20px;
  `;

  const templates = {
    APPOINTMENT_CREATED: {
      subject: '📅 New Appointment Request - HealthCare+',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle} background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%);">
              <h1 style="margin: 0; font-size: 24px;">New Appointment Request</h1>
            </div>
            <div style="${contentStyle}">
              <p style="color: #64748b; font-size: 16px;">Hello Dr. ${data.doctorName},</p>
              <p style="color: #334155; font-size: 16px;">You have received a new appointment request from a patient.</p>
              
              <div style="background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1e293b;">📋 Appointment Details</h3>
                <p style="margin: 8px 0; color: #475569;"><strong>Patient:</strong> ${data.patientName}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Email:</strong> ${data.patientEmail}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Date:</strong> ${formatDate(data.date)}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Time:</strong> ${data.timeSlot}</p>
                <p style="margin: 8px 0; color: #475569;"><strong>Reason:</strong> ${data.reason || 'Not specified'}</p>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">Please log in to your dashboard to approve or decline this request.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/doctor" style="${buttonStyle}">
                  View Dashboard
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} HealthCare+ | Smart Healthcare Appointment System</p>
            </div>
          </div>
        </div>
      `
    },
    APPOINTMENT_APPROVED: {
      subject: '✅ Appointment Approved - HealthCare+',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle} background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
              <h1 style="margin: 0; font-size: 24px;">Appointment Approved! 🎉</h1>
            </div>
            <div style="${contentStyle}">
              <p style="color: #64748b; font-size: 16px;">Hello ${data.patientName},</p>
              <p style="color: #334155; font-size: 16px;">Great news! Your appointment has been approved by Dr. ${data.doctorName}.</p>
              
              <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #bbf7d0;">
                <h3 style="margin: 0 0 15px 0; color: #166534;">📅 Confirmed Appointment</h3>
                <p style="margin: 8px 0; color: #166534;"><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>Date:</strong> ${formatDate(data.date)}</p>
                <p style="margin: 8px 0; color: #166534;"><strong>Time:</strong> ${data.timeSlot}</p>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">You can now message your doctor through the dashboard. Please arrive 10 minutes before your scheduled time.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/patient" style="${buttonStyle}">
                  View My Appointments
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} HealthCare+ | Smart Healthcare Appointment System</p>
            </div>
          </div>
        </div>
      `
    },
    APPOINTMENT_CANCELLED: {
      subject: '❌ Appointment Cancelled - HealthCare+',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle} background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);">
              <h1 style="margin: 0; font-size: 24px;">Appointment Cancelled</h1>
            </div>
            <div style="${contentStyle}">
              <p style="color: #64748b; font-size: 16px;">Hello ${data.patientName || data.doctorName},</p>
              <p style="color: #334155; font-size: 16px;">We're sorry to inform you that an appointment has been cancelled.</p>
              
              <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #fecaca;">
                <h3 style="margin: 0 0 15px 0; color: #991b1b;">📋 Cancelled Appointment</h3>
                <p style="margin: 8px 0; color: #991b1b;"><strong>Patient:</strong> ${data.patientName}</p>
                <p style="margin: 8px 0; color: #991b1b;"><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
                <p style="margin: 8px 0; color: #991b1b;"><strong>Date:</strong> ${formatDate(data.date)}</p>
                <p style="margin: 8px 0; color: #991b1b;"><strong>Time:</strong> ${data.timeSlot}</p>
                <p style="margin: 8px 0; color: #991b1b;"><strong>Cancelled by:</strong> ${data.cancelledBy}</p>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">If you need to reschedule, please book a new appointment through our platform.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" style="${buttonStyle}">
                  Book New Appointment
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} HealthCare+ | Smart Healthcare Appointment System</p>
            </div>
          </div>
        </div>
      `
    },
    APPOINTMENT_COMPLETED: {
      subject: '🎉 Appointment Completed - Thank You! - HealthCare+',
      html: `
        <div style="${baseStyle}">
          <div style="${cardStyle}">
            <div style="${headerStyle} background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);">
              <h1 style="margin: 0; font-size: 24px;">Thank You for Your Visit! 🎉</h1>
            </div>
            <div style="${contentStyle}">
              <p style="color: #64748b; font-size: 16px;">Hello ${data.patientName},</p>
              <p style="color: #334155; font-size: 16px;">Your appointment with Dr. ${data.doctorName} has been completed. We hope you had a great experience!</p>
              
              <div style="background: #f5f3ff; border-radius: 12px; padding: 20px; margin: 20px 0; border: 1px solid #ddd6fe;">
                <h3 style="margin: 0 0 15px 0; color: #5b21b6;">📋 Appointment Summary</h3>
                <p style="margin: 8px 0; color: #5b21b6;"><strong>Doctor:</strong> Dr. ${data.doctorName}</p>
                <p style="margin: 8px 0; color: #5b21b6;"><strong>Date:</strong> ${formatDate(data.date)}</p>
                <p style="margin: 8px 0; color: #5b21b6;"><strong>Status:</strong> ✅ Completed</p>
              </div>
              
              <p style="color: #64748b; font-size: 14px;">You can view your appointment history and doctor's notes in your dashboard. If you need a follow-up, you can book another appointment anytime.</p>
              
              <div style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard/patient" style="${buttonStyle}">
                  View History
                </a>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 20px; text-align: center; color: #94a3b8; font-size: 12px;">
              <p style="margin: 0;">© ${new Date().getFullYear()} HealthCare+ | Smart Healthcare Appointment System</p>
            </div>
          </div>
        </div>
      `
    }
  };

  return templates[type] || null;
};

const sendEmail = async (to, type, data) => {
  const template = getEmailTemplate(type, data);
  
  if (!template) {
    console.log(`No email template found for type: ${type}`);
    return false;
  }

  const mailOptions = {
    from: `"HealthCare+" <${process.env.SMTP_USER || 'noreply@healthcare.com'}>`,
    to,
    subject: template.subject,
    html: template.html
  };

  // Log the email for debugging
  console.log(`📧 Sending email to: ${to}`);
  console.log(`   Subject: ${template.subject}`);

  // If no transporter or SMTP not configured, just log
  if (!transporter || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log('   [SIMULATED] Email would be sent with above details');
    return true;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`   ✅ Email sent successfully! Message ID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error sending email: ${error.message}`);
    return false;
  }
};

module.exports = {
  initEmailService,
  sendEmail
};
