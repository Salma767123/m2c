/**
 * Courier partners — admin-managed, dynamic.
 *
 * Admin CRUD + a public active-list feed. Products reference courier ids in
 * logisticsConfig.courierIds; the storefront resolves those against this list, filtered
 * by the shopper's region and transport mode.
 *
 * Permissions reuse the `all_products:*` set — couriers are product-logistics config, so
 * whoever manages products manages couriers. Super Admin bypasses regardless.
 */

const { prisma } = require('../config/database');

const REGIONS = ['IN', 'US'];
const MODES = ['AIR', 'SHIP'];

function buildCourierData(body) {
  const { name, code, color, logo, region, modes, isActive, sortOrder } = body;
  if (!name || !String(name).trim()) return { error: 'Name is required' };
  if (!code || !String(code).trim()) return { error: 'Code (short badge) is required' };
  if (!REGIONS.includes(region)) return { error: `region must be one of ${REGIONS.join(', ')}` };
  const cleanModes = Array.isArray(modes) ? modes.filter((m) => MODES.includes(m)) : [];
  if (cleanModes.length === 0) return { error: 'Select at least one transport mode (AIR / SHIP)' };
  return {
    data: {
      name: String(name).trim(),
      code: String(code).trim().slice(0, 5).toUpperCase(),
      color: color && String(color).trim() ? String(color).trim() : '#1a1a1a',
      // Optional logo URL — an empty string clears it back to the code/colour badge.
      logo: logo && String(logo).trim() ? String(logo).trim() : null,
      region,
      modes: cleanModes,
      isActive: isActive === undefined ? true : !!isActive,
      sortOrder: Number(sortOrder) || 0,
    },
  };
}

// ─────────────────────────────── Admin CRUD ────────────────────────────────

const createCourier = async (req, res) => {
  try {
    const built = buildCourierData(req.body);
    if (built.error) return res.status(400).json({ success: false, message: built.error });
    const courier = await prisma.courier.create({ data: built.data });
    res.status(201).json({ success: true, data: courier });
  } catch (error) {
    console.error('Create courier error:', error);
    res.status(500).json({ success: false, message: 'Failed to create courier' });
  }
};

const getCouriers = async (req, res) => {
  try {
    const couriers = await prisma.courier.findMany({ orderBy: [{ region: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }] });
    res.json({ success: true, data: couriers });
  } catch (error) {
    console.error('Get couriers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch couriers' });
  }
};

const updateCourier = async (req, res) => {
  try {
    const existing = await prisma.courier.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Courier not found' });
    const built = buildCourierData({ ...existing, ...req.body });
    if (built.error) return res.status(400).json({ success: false, message: built.error });
    const courier = await prisma.courier.update({ where: { id: req.params.id }, data: built.data });
    res.json({ success: true, data: courier });
  } catch (error) {
    console.error('Update courier error:', error);
    res.status(500).json({ success: false, message: 'Failed to update courier' });
  }
};

const deleteCourier = async (req, res) => {
  try {
    await prisma.courier.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Courier deleted' });
  } catch (error) {
    console.error('Delete courier error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete courier' });
  }
};

// ─────────────────────────────── Public feed ───────────────────────────────

// Active couriers for the storefront + admin product picker. Optional ?region / ?mode
// narrow the list; product-level selection is applied client-side against courierIds.
const getActiveCouriers = async (req, res) => {
  try {
    const { region, mode } = req.query;
    const where = { isActive: true };
    if (REGIONS.includes(region)) where.region = region;
    if (MODES.includes(mode)) where.modes = { has: mode };
    const couriers = await prisma.courier.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
    res.json({ success: true, data: couriers });
  } catch (error) {
    console.error('Get active couriers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch couriers' });
  }
};

module.exports = { createCourier, getCouriers, updateCourier, deleteCourier, getActiveCouriers };
