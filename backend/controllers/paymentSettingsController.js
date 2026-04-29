const { prisma } = require('../config/database');

// Get payment settings
const getPaymentSettings = async (req, res) => {
  try {
    // Get the first (and only) payment settings document
    let settings = await prisma.paymentSettings.findFirst();

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.paymentSettings.create({
        data: {
          razorpayEnabled: false,
          payuEnabled: false
        }
      });
    }

    // Don't send sensitive data to frontend
    const sanitizedSettings = {
      id: settings.id,
      razorpayEnabled: settings.razorpayEnabled,
      razorpayKeyId: settings.razorpayKeyId || '',
      razorpayKeySecret: settings.razorpayKeySecret ? '••••••••' : '', // Mask the secret
      razorpayWebhookSecret: settings.razorpayWebhookSecret ? '••••••••' : '', // Mask the secret
      payuEnabled: settings.payuEnabled,
      payuMerchantKey: settings.payuMerchantKey || '',
      payuMerchantSalt: settings.payuMerchantSalt ? '••••••••' : '', // Mask the salt
      updatedAt: settings.updatedAt
    };

    res.json({
      success: true,
      data: sanitizedSettings
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment settings'
    });
  }
};

// Get public payment settings (no authentication required)
const getPublicPaymentSettings = async (req, res) => {
  try {
    // Get the first (and only) payment settings document
    let settings = await prisma.paymentSettings.findFirst();

    // If no settings exist, return default disabled settings
    if (!settings) {
      return res.json({
        success: true,
        data: {
          razorpayEnabled: false,
          payuEnabled: false
        }
      });
    }

    // Only send enabled status and public keys (no secrets)
    const publicSettings = {
      razorpayEnabled: settings.razorpayEnabled,
      razorpayKeyId: settings.razorpayEnabled ? settings.razorpayKeyId : null,
      payuEnabled: settings.payuEnabled,
      payuMerchantKey: settings.payuEnabled ? settings.payuMerchantKey : null
    };

    res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    console.error('Get public payment settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment settings'
    });
  }
};

// Update Razorpay settings
const updateRazorpaySettings = async (req, res) => {
  try {
    const {
      enabled,
      keyId,
      keySecret,
      webhookSecret
    } = req.body;

    // Validation
    if (enabled && (!keyId || !keySecret)) {
      return res.status(400).json({
        success: false,
        error: 'Key ID and Key Secret are required when enabling Razorpay'
      });
    }

    // Get existing settings or create new
    let settings = await prisma.paymentSettings.findFirst();

    const updateData = {
      razorpayEnabled: enabled,
      updatedBy: req.user?.id
    };

    // If enabling Razorpay, disable PayU
    if (enabled) {
      updateData.payuEnabled = false;
    }

    // Only update credentials if they are provided and not masked
    if (keyId) updateData.razorpayKeyId = keyId.replace(/^,+|,+$/g, '').trim();
    if (keySecret && keySecret !== '••••••••') updateData.razorpayKeySecret = keySecret.replace(/^,+|,+$/g, '').trim();
    if (webhookSecret && webhookSecret !== '••••••••') updateData.razorpayWebhookSecret = webhookSecret.replace(/^,+|,+$/g, '').trim();

    if (settings) {
      // Update existing settings
      settings = await prisma.paymentSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      // Create new settings
      settings = await prisma.paymentSettings.create({
        data: {
          ...updateData,
          payuEnabled: false
        }
      });
    }

    // Return sanitized data
    const sanitizedSettings = {
      id: settings.id,
      razorpayEnabled: settings.razorpayEnabled,
      razorpayKeyId: settings.razorpayKeyId || '',
      razorpayKeySecret: settings.razorpayKeySecret ? '••••••••' : '',
      razorpayWebhookSecret: settings.razorpayWebhookSecret ? '••••••••' : '',
      payuEnabled: settings.payuEnabled,
      updatedAt: settings.updatedAt
    };

    const message = enabled
      ? 'Razorpay enabled successfully. PayU has been disabled.'
      : 'Razorpay settings updated successfully';

    res.json({
      success: true,
      message,
      data: sanitizedSettings
    });
  } catch (error) {
    console.error('Update Razorpay settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update Razorpay settings'
    });
  }
};

// Update PayU settings
const updatePayUSettings = async (req, res) => {
  try {
    const {
      enabled,
      merchantKey,
      merchantSalt
    } = req.body;

    // Validation
    if (enabled && (!merchantKey || !merchantSalt)) {
      return res.status(400).json({
        success: false,
        error: 'Merchant Key and Merchant Salt are required when enabling PayU'
      });
    }

    // Get existing settings or create new
    let settings = await prisma.paymentSettings.findFirst();

    const updateData = {
      payuEnabled: enabled,
      updatedBy: req.user?.id
    };

    // If enabling PayU, disable Razorpay
    if (enabled) {
      updateData.razorpayEnabled = false;
    }

    // Only update credentials if they are provided and not masked
    if (merchantKey) updateData.payuMerchantKey = merchantKey.replace(/^,+|,+$/g, '').trim();
    if (merchantSalt && merchantSalt !== '••••••••') updateData.payuMerchantSalt = merchantSalt.replace(/^,+|,+$/g, '').trim();

    if (settings) {
      // Update existing settings
      settings = await prisma.paymentSettings.update({
        where: { id: settings.id },
        data: updateData
      });
    } else {
      // Create new settings
      settings = await prisma.paymentSettings.create({
        data: {
          ...updateData,
          razorpayEnabled: false
        }
      });
    }

    // Return sanitized data
    const sanitizedSettings = {
      id: settings.id,
      payuEnabled: settings.payuEnabled,
      payuMerchantKey: settings.payuMerchantKey || '',
      payuMerchantSalt: settings.payuMerchantSalt ? '••••••••' : '',
      razorpayEnabled: settings.razorpayEnabled,
      updatedAt: settings.updatedAt
    };

    const message = enabled
      ? 'PayU enabled successfully. Razorpay has been disabled.'
      : 'PayU settings updated successfully';

    res.json({
      success: true,
      message,
      data: sanitizedSettings
    });
  } catch (error) {
    console.error('Update PayU settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update PayU settings'
    });
  }
};

module.exports = {
  getPaymentSettings,
  getPublicPaymentSettings,
  updateRazorpaySettings,
  updatePayUSettings
};
