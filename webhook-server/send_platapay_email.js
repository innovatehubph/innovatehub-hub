const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Email configuration (from webhook-server)
const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'admin@innovatehub.ph',
    pass: 'Bossmarc@747'
  }
});

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header Image -->
                    <tr>
                        <td style="padding: 0;">
                            <img src="cid:platapay_banner" alt="PlataPay Agent Opportunity" style="width: 100%; height: auto; display: block;">
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 30px 40px;">
                            <h1 style="color: #57317A; margin: 0 0 20px 0; font-size: 28px;">💰 MAGING PLATAPAY AGENT KA NA! 💰</h1>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi!</p>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                Gusto mo bang magkaroon ng <strong>sariling negosyo</strong> na mababa ang puhunan pero malaki ang kita?
                            </p>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                Ang <strong style="color: #57317A;">PlataPay</strong> ay isang all-in-one digital payment platform na nagbibigay-daan sa'yo na kumita sa pamamagitan ng iba't ibang financial services:
                            </p>
                            
                            <!-- Services Grid -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
                                <tr><td style="padding: 8px 0;">✅ Bills Payment (Meralco, PLDT, Water, etc.)</td></tr>
                                <tr><td style="padding: 8px 0;">✅ E-Load & E-Pins (All Networks)</td></tr>
                                <tr><td style="padding: 8px 0;">✅ Remittance Services</td></tr>
                                <tr><td style="padding: 8px 0;">✅ Cash-In / Cash-Out</td></tr>
                                <tr><td style="padding: 8px 0;">✅ Bank Transfers & QR Ph</td></tr>
                                <tr><td style="padding: 8px 0;">✅ Insurance, Travel & J&T Express</td></tr>
                            </table>
                            
                            <!-- Why PlataPay Section -->
                            <div style="background: linear-gradient(135deg, #57317A 0%, #7B4FA2 100%); color: white; padding: 25px; border-radius: 8px; margin: 25px 0;">
                                <h2 style="margin: 0 0 15px 0; font-size: 22px;">🎯 BAKIT PLATAPAY?</h2>
                                <p style="margin: 8px 0;">📈 <strong>94+ Active Agents Nationwide</strong> - at lumalaki pa!</p>
                                <p style="margin: 8px 0;">💵 <strong>Up to 5% Commission</strong> sa bawat transaction</p>
                                <p style="margin: 8px 0;">🏠 Pwede sa bahay o sa tindahan</p>
                                <p style="margin: 8px 0;">📱 Gamit lang ang smartphone mo</p>
                                <p style="margin: 8px 0;">🤝 Full support at training mula sa team</p>
                            </div>
                            
                            <!-- Packages -->
                            <h2 style="color: #57317A; margin: 25px 0 15px 0;">🔥 PACKAGES AVAILABLE:</h2>
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="padding: 10px; background-color: #f3e5f5; border-radius: 6px; margin-bottom: 10px;">
                                        <strong>• Starter Package</strong> - Perfect for beginners
                                    </td>
                                </tr>
                                <tr><td style="height: 10px;"></td></tr>
                                <tr>
                                    <td style="padding: 10px; background-color: #e1bee7; border-radius: 6px;">
                                        <strong>• Business Package</strong> - For serious entrepreneurs
                                    </td>
                                </tr>
                                <tr><td style="height: 10px;"></td></tr>
                                <tr>
                                    <td style="padding: 10px; background-color: #ce93d8; border-radius: 6px;">
                                        <strong>• Premium Package</strong> - Maximum earning potential
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Top Locations -->
                            <h3 style="color: #57317A; margin: 25px 0 10px 0;">📍 Top Locations ng mga Agents:</h3>
                            <p style="color: #666; font-size: 14px; line-height: 1.8;">
                                Batangas (28) • Bulacan (4) • Manila (4) • Quezon (3) • Cebu (3)
                            </p>
                            
                            <!-- CTA Button -->
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://platapay.ph" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; font-weight: bold; padding: 15px 40px; text-decoration: none; border-radius: 50px; font-size: 18px; box-shadow: 0 4px 15px rgba(40,167,69,0.4);">
                                    MAG-APPLY NA! 🚀
                                </a>
                            </div>
                            
                            <p style="color: #333; font-size: 16px; line-height: 1.6;">
                                Huwag palampasin ang pagkakataong ito na magkaroon ng <strong>sustainable income!</strong>
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Contact Section -->
                    <tr>
                        <td style="background-color: #57317A; padding: 25px 40px; color: white;">
                            <h3 style="margin: 0 0 15px 0;">📞 Contact Us Today:</h3>
                            <p style="margin: 5px 0;">🌐 Website: <a href="https://platapay.ph" style="color: #ffc107;">platapay.ph</a></p>
                            <p style="margin: 5px 0;">📧 Email: <a href="mailto:support@platapay.ph" style="color: #ffc107;">support@platapay.ph</a></p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f5f5f5; text-align: center;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                Best regards,<br>
                                <strong>PlataPay Team</strong><br>
                                InnovateHub Inc.
                            </p>
                            <p style="color: #bbb; font-size: 10px; margin: 15px 0 0 0;">
                                This is a marketing communication from PlataPay.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;

async function sendEmail() {
  try {
    // Verify connection first
    await transporter.verify();
    console.log('✅ SMTP connection verified');
    
    const mailOptions = {
      from: '"PlataPay" <admin@innovatehub.ph>',
      to: 'mragbay@gmail.com',
      subject: '🚀 Maging PlataPay Agent Ka Na! - Your Path to Financial Freedom',
      html: htmlContent,
      attachments: [
        {
          filename: 'platapay_banner.jpg',
          path: '/root/.openclaw/workspace/platapay_email_optimized.jpg',
          cid: 'platapay_banner'
        }
      ]
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', result.messageId);
    console.log('📬 To:', mailOptions.to);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

sendEmail();
