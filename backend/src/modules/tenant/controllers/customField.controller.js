const { CustomField } = require('../../../../models');

exports.getCustomFields = async (req, res) => {
  try {
    const { entityType } = req.params;
    
    // Fetch fields that match the tenant or are 'system' default
    const fields = await CustomField.findAll({
      where: {
        entity_type: entityType,
        tenant_id: [req.tenant.id, 'default']
      },
      order: [['id', 'ASC']]
    });

    res.json({
      success: true,
      data: fields
    });
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createCustomField = async (req, res) => {
  try {
    const { entity_type, field_name, field_key, field_type, is_required, options } = req.body;

    if (!entity_type || !field_name || !field_key) {
      return res.status(400).json({ success: false, message: 'Entity type, field name, and field key are required.' });
    }

    const newField = await CustomField.create({
      tenant_id: req.tenant.id,
      entity_type,
      field_name,
      field_key,
      field_type: field_type || 'text',
      is_required: is_required || false,
      options: options || null
    });

    res.status(201).json({
      success: true,
      message: 'Custom field created successfully',
      data: newField
    });
  } catch (error) {
    console.error('Error creating custom field:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteCustomField = async (req, res) => {
  try {
    const { id } = req.params;

    const field = await CustomField.findOne({
      where: {
        id,
        tenant_id: req.tenant.id
      }
    });

    if (!field) {
      return res.status(404).json({ success: false, message: 'Custom field not found.' });
    }

    await field.destroy();

    res.json({ success: true, message: 'Custom field deleted successfully.' });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
